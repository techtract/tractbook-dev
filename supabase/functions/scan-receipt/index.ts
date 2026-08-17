import { createClient } from "npm:@supabase/supabase-js@2"
import { TextractClient, AnalyzeExpenseCommand } from "npm:@aws-sdk/client-textract@3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function parseAmount(s?: string): number {
  if (!s) return 0
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""))
  return isNaN(n) ? 0 : n
}

function parseDateToISO(s?: string): string | null {
  if (!s) return null
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { storagePath } = await req.json()
    if (!storagePath) {
      return new Response(JSON.stringify({ error: "storagePath is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const businessId = storagePath.split("/")[0]
    const { data: business } = await supabase
      .from("businesses")
      .select("name")
      .eq("id", businessId)
      .maybeSingle()
    const businessName = business?.name || null

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("receipts")
      .download(storagePath)

    if (downloadError || !fileBlob) {
      return new Response(
        JSON.stringify({ error: downloadError?.message || "Could not download the uploaded file." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const fileBytes = new Uint8Array(await fileBlob.arrayBuffer())

    const textract = new TextractClient({
      region: Deno.env.get("AWS_REGION") || "us-east-1",
      credentials: {
        accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
        secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
      },
    })

    const textractResult = await textract.send(
      new AnalyzeExpenseCommand({ Document: { Bytes: fileBytes } })
    )

    const summaryFields: Record<string, { value: string; confidence: number }> = {}
    const lineItems: { item_name: string; quantity: number; unit_price: number; line_total: number; tax_rate: number }[] = []

    const expenseDoc = textractResult.ExpenseDocuments?.[0]
    if (expenseDoc) {
      for (const field of expenseDoc.SummaryFields || []) {
        const type = field.Type?.Text
        const value = field.ValueDetection?.Text
        const confidence = field.ValueDetection?.Confidence
        if (type && value) {
          summaryFields[type] = { value, confidence: confidence || 0 }
        }
      }

      for (const group of expenseDoc.LineItemGroups || []) {
        for (const item of group.LineItems || []) {
          const fields: Record<string, string> = {}
          for (const f of item.LineItemExpenseFields || []) {
            const type = f.Type?.Text
            const value = f.ValueDetection?.Text
            if (type && value) fields[type] = value
          }
          lineItems.push({
            item_name: fields["ITEM"] || fields["PRODUCT_CODE"] || "Item",
            quantity: parseAmount(fields["QUANTITY"]) || 1,
            unit_price: parseAmount(fields["UNIT_PRICE"] || fields["PRICE"]),
            line_total: parseAmount(fields["PRICE"] || fields["AMOUNT"]),
            tax_rate: parseAmount(fields["TAX"]),
          })
        }
      }
    }

    const rawSubtotal = parseAmount(summaryFields["SUBTOTAL"]?.value)
    const rawTax = parseAmount(summaryFields["TAX"]?.value)
    const rawTotal = parseAmount(summaryFields["TOTAL"]?.value)
    const total = rawTotal > 0 ? rawTotal : rawSubtotal + rawTax
    const amountDue = parseAmount(summaryFields["AMOUNT_DUE"]?.value)
    const amountPaid = parseAmount(summaryFields["AMOUNT_PAID"]?.value)

    let ruleBasedPaymentStatus: "paid" | "unpaid" | null = null
    if (total > 0 && amountPaid >= total) {
      ruleBasedPaymentStatus = "paid"
    } else if (amountDue > 0 || summaryFields["DUE_DATE"]?.value) {
      ruleBasedPaymentStatus = "unpaid"
    }

    const extracted = {
      vendor_name: summaryFields["VENDOR_NAME"]?.value || null,
      document_date: parseDateToISO(summaryFields["INVOICE_RECEIPT_DATE"]?.value),
      due_date: parseDateToISO(summaryFields["DUE_DATE"]?.value),
      subtotal: rawSubtotal,
      tax_total: rawTax,
      total,
      amount_due: amountDue,
      amount_paid: amountPaid,
      bill_to_name: summaryFields["RECEIVER_NAME"]?.value || null,
      bill_to_address: summaryFields["RECEIVER_ADDRESS"]?.value || null,
      line_items: lineItems,
    }

    const confidences = Object.values(summaryFields).map((f) => f.confidence)
    const avgConfidence = confidences.length > 0
      ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
      : null

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!

    const prompt = `You are reviewing an extracted expense document for a small business accounting app. Here is the raw data OCR pulled off the document:

${JSON.stringify(extracted, null, 2)}

This document was scanned by: ${businessName || "an unknown business"}

Tasks:
1. Suggest a single best-fit category from: Software, Office supplies, Travel, Utilities, Payroll, Repairs & maintenance, Other.
${ruleBasedPaymentStatus
  ? `2. payment_status is already determined to be "${ruleBasedPaymentStatus}" from the numbers — just echo that value back exactly, don't recompute it.`
  : `2. Determine payment_status ("paid" or "unpaid") — the numbers here are ambiguous, use your best judgment.`}
3. Check for anomalies, including:
   - Does subtotal + tax_total roughly match total (within a few cents)?
   - Could there be multiple candidate "total" values that got confused (e.g. a period total vs. a grand total vs. a line sub-total)?
   - Does bill_to_name look like it genuinely matches "${businessName || "the business scanning this"}"? If bill_to_name is present and clearly refers to a different person or company, flag this — it may mean this document doesn't actually belong to this business.
   - Is anything else clearly missing, inconsistent, or suspicious?

Respond with ONLY valid JSON, no other text, in this exact shape:
{"category": "...", "payment_status": "...", "is_flagged": true or false, "flag_reason": "..." or null}`

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    const claudeData = await claudeResponse.json()
    const claudeText = claudeData?.content?.[0]?.text || "{}"

    let classification
    try {
      classification = JSON.parse(claudeText)
    } catch {
      classification = { category: "Other", payment_status: ruleBasedPaymentStatus || "unknown", is_flagged: false, flag_reason: null }
    }

    return new Response(
      JSON.stringify({
        ...extracted,
        confidence_score: avgConfidence,
        category: classification.category,
        payment_status: ruleBasedPaymentStatus || classification.payment_status,
        is_flagged: classification.is_flagged,
        flag_reason: classification.flag_reason,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
