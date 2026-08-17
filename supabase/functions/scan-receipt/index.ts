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
    const lineItems: { item_name: string; quantity: number; unit_price: number; line_total: number }[] = []

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
          })
        }
      }
    }

    const extracted = {
      vendor_name: summaryFields["VENDOR_NAME"]?.value || null,
      document_date: summaryFields["INVOICE_RECEIPT_DATE"]?.value || null,
      due_date: summaryFields["DUE_DATE"]?.value || null,
      subtotal: parseAmount(summaryFields["SUBTOTAL"]?.value),
      tax_total: parseAmount(summaryFields["TAX"]?.value),
      total: parseAmount(summaryFields["TOTAL"]?.value || summaryFields["AMOUNT_DUE"]?.value),
      amount_paid: parseAmount(summaryFields["AMOUNT_PAID"]?.value),
      line_items: lineItems,
    }

    const confidences = Object.values(summaryFields).map((f) => f.confidence)
    const avgConfidence = confidences.length > 0
      ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
      : null

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!

    const prompt = `You are reviewing an extracted expense document for a small business accounting app. Here is the raw data OCR pulled off the document:

${JSON.stringify(extracted, null, 2)}

Tasks:
1. Suggest a single best-fit category from: Software, Office supplies, Travel, Utilities, Payroll, Repairs & maintenance, Other.
2. Determine payment_status: "paid" if amount_paid >= total and total > 0 (or the document clearly shows payment received), "unpaid" if there's a due date and no payment shown, "unknown" if genuinely ambiguous.
3. Check for anomalies: does subtotal + tax_total roughly match total (within a few cents)? Could there be multiple candidate "total" values that got confused (e.g. a period total vs. a grand total vs. a line sub-total)? Is anything clearly missing, inconsistent, or suspicious?

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
      classification = { category: "Other", payment_status: "unknown", is_flagged: false, flag_reason: null }
    }

    return new Response(
      JSON.stringify({
        ...extracted,
        confidence_score: avgConfidence,
        category: classification.category,
        payment_status: classification.payment_status,
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
