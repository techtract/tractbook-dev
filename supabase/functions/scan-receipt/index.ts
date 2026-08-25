import { createClient } from "npm:@supabase/supabase-js@2"
import { TextractClient, AnalyzeExpenseCommand } from "npm:@aws-sdk/client-textract@3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type CheckStatus = "pass" | "warning" | "fail"
interface RiskCheck {
  check: string
  status: CheckStatus
  detail: string
}

const SUPPORTED_CURRENCIES = ["USD", "CAD", "GBP", "EUR"]
const FULL_SUPPORT_CURRENCIES = ["USD", "CAD"]

function parseAmount(s?: string): number {
  if (!s) return 0
  const cleaned = s.replace(/,/g, "")
  const match = cleaned.match(/-?\d+(\.\d+)?/)
  if (!match) return 0
  const n = parseFloat(match[0])
  return isNaN(n) ? 0 : n
}

function parseDateToISO(s?: string): string | null {
  if (!s) return null
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

function separateGluedText(s: string): string {
  return s.replace(/([a-zA-Z)])(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s/g, "$1 - $2 ")
}

// Scans all extracted text for currency signals. Checks explicit
// codes/symbols first (most reliable), falls back to bare "$" = USD.
function detectCurrency(allText: string): string | null {
  if (/\bCAD\b/i.test(allText) || /CA\$/.test(allText) || /C\$/.test(allText)) return "CAD"
  if (/\bUSD\b/i.test(allText)) return "USD"
  if (/\bGBP\b/i.test(allText) || /£/.test(allText)) return "GBP"
  if (/\bEUR\b/i.test(allText) || /€/.test(allText)) return "EUR"
  if (/\bINR\b/i.test(allText) || /₹/.test(allText)) return "INR"
  if (/\$/.test(allText)) return "USD"
  return null
}

// Looks for a tax-type keyword with a percentage nearby (e.g. "HST -
// Canada (13% on CA$28.00)" or "GST/HST 13%") and builds a real label
// like "HST 13%" instead of a bare "Tax".
function detectTaxLabel(allText: string): string | null {
  const match = allText.match(/\b(HST|GST|PST|QST|VAT|Sales Tax)\b[^\d%]*(\d+(?:\.\d+)?)\s*%/i)
  if (match) {
    return `${match[1].toUpperCase()} ${match[2]}%`
  }
  const bareMatch = allText.match(/\b(HST|GST|PST|QST|VAT)\b/i)
  if (bareMatch) return bareMatch[1].toUpperCase()
  return null
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
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
    const labelTexts: string[] = []
    const lineItems: { item_name: string; quantity: number; unit_price: number; line_total: number; tax_rate: number }[] = []

    const expenseDoc = textractResult.ExpenseDocuments?.[0]
    if (expenseDoc) {
      for (const field of expenseDoc.SummaryFields || []) {
        const type = field.Type?.Text
        const value = field.ValueDetection?.Text
        const label = field.LabelDetection?.Text
        const confidence = field.ValueDetection?.Confidence
        if (type && value) {
          summaryFields[type] = { value, confidence: confidence || 0 }
        }
        if (label) {
          labelTexts.push(label)
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
          const rawItemName = (fields["ITEM"] || fields["PRODUCT_CODE"] || "Item").replace(/\n+/g, " - ")
          lineItems.push({
            item_name: separateGluedText(rawItemName),
            quantity: parseAmount(fields["QUANTITY"]) || 1,
            unit_price: parseAmount(fields["UNIT_PRICE"] || fields["PRICE"]),
            line_total: parseAmount(fields["PRICE"] || fields["AMOUNT"]),
            tax_rate: parseAmount(fields["TAX"]),
          })
        }
      }
    }

    const allText = Object.values(summaryFields).map((f) => f.value).join(" ") + " " + labelTexts.join(" ")
    const detectedCurrency = detectCurrency(allText)
    const currencySupported = detectedCurrency !== null && SUPPORTED_CURRENCIES.includes(detectedCurrency)
    const fullSupport = detectedCurrency !== null && FULL_SUPPORT_CURRENCIES.includes(detectedCurrency)
    const taxLabel = detectTaxLabel(allText)

    const rawSubtotal = parseAmount(summaryFields["SUBTOTAL"]?.value)
    const rawTax = parseAmount(summaryFields["TAX"]?.value)
    const rawTotal = parseAmount(summaryFields["TOTAL"]?.value)
    const total = rawTotal > 0 ? rawTotal : rawSubtotal + rawTax
    const amountDue = parseAmount(summaryFields["AMOUNT_DUE"]?.value)
    const amountPaid = parseAmount(summaryFields["AMOUNT_PAID"]?.value)
    const documentNumber = summaryFields["INVOICE_RECEIPT_ID"]?.value || null
    const vendorName = summaryFields["VENDOR_NAME"]?.value || null
    const documentDate = parseDateToISO(summaryFields["INVOICE_RECEIPT_DATE"]?.value)
    const dueDate = parseDateToISO(summaryFields["DUE_DATE"]?.value)

    const rawBillToName = summaryFields["RECEIVER_NAME"]?.value || null
    let billToAddress = summaryFields["RECEIVER_ADDRESS"]?.value || null
    if (rawBillToName && billToAddress) {
      const lines = billToAddress.split("\n")
      if (lines[0]?.trim().toLowerCase() === rawBillToName.trim().toLowerCase()) {
        billToAddress = lines.slice(1).join("\n").trim() || null
      }
    }

    let ruleBasedPaymentStatus: "paid" | "unpaid" | null = null
    if (total > 0 && amountPaid >= total) {
      ruleBasedPaymentStatus = "paid"
    } else if (amountDue > 0 || summaryFields["DUE_DATE"]?.value) {
      ruleBasedPaymentStatus = "unpaid"
    }

    const riskChecks: RiskCheck[] = []

    if (!currencySupported) {
      riskChecks.push({
        check: "currency_support",
        status: "fail",
        detail: `${detectedCurrency || "This currency"} isn't supported yet. Only USD, CAD, GBP, and EUR can be scanned right now.`,
      })
    } else if (!fullSupport) {
      riskChecks.push({
        check: "currency_support",
        status: "warning",
        detail: `${detectedCurrency} is scannable but doesn't have full validation yet - USD and CAD get the deepest checks.`,
      })
    } else {
      riskChecks.push({ check: "currency_support", status: "pass", detail: `${detectedCurrency} fully supported.` })
    }

    if (vendorName && documentNumber && total > 0) {
      const { data: dupes } = await supabase
        .from("expenses")
        .select("id")
        .eq("business_id", businessId)
        .ilike("vendor_name", vendorName)
        .eq("document_number", documentNumber)
        .eq("total", total)
        .limit(1)

      if (dupes && dupes.length > 0) {
        riskChecks.push({
          check: "duplicate",
          status: "fail",
          detail: `A matching expense from ${vendorName} (${documentNumber}, ${total.toFixed(2)}) already exists.`,
        })
      } else {
        riskChecks.push({ check: "duplicate", status: "pass", detail: "No matching expense found." })
      }
    } else {
      riskChecks.push({
        check: "duplicate",
        status: "warning",
        detail: "Couldn't check for duplicates - vendor name or document number wasn't extracted.",
      })
    }

    if (vendorName) {
      const { data: existingVendors } = await supabase
        .from("vendors")
        .select("name")
        .eq("business_id", businessId)

      const normalized = vendorName.trim().toLowerCase()
      let closestMatch: { name: string; distance: number } | null = null
      let exactMatch = false

      for (const v of existingVendors || []) {
        const vNorm = v.name.trim().toLowerCase()
        if (vNorm === normalized) {
          exactMatch = true
          break
        }
        const dist = levenshtein(normalized, vNorm)
        if (dist > 0 && dist <= 2 && Math.min(normalized.length, vNorm.length) >= 4) {
          if (!closestMatch || dist < closestMatch.distance) {
            closestMatch = { name: v.name, distance: dist }
          }
        }
      }

      if (vendorName.trim().length <= 2) {
        riskChecks.push({
          check: "vendor_identity",
          status: "warning",
          detail: `Vendor name "${vendorName}" looks too short to be reliable - likely misread a logo mark instead of the business name. Worth double-checking.`,
        })
      } else if (exactMatch) {
        riskChecks.push({ check: "vendor_identity", status: "pass", detail: `Matches known vendor "${vendorName}".` })
      } else if (closestMatch) {
        riskChecks.push({
          check: "vendor_identity",
          status: "warning",
          detail: `"${vendorName}" is very similar to your existing vendor "${closestMatch.name}" - possible typo or impersonation.`,
        })
      } else {
        riskChecks.push({ check: "vendor_identity", status: "pass", detail: `New vendor "${vendorName}" - no similar name conflicts found.` })
      }
    } else {
      riskChecks.push({ check: "vendor_identity", status: "warning", detail: "Vendor name wasn't extracted." })
    }

    if (documentDate && dueDate) {
      if (new Date(dueDate) < new Date(documentDate)) {
        riskChecks.push({
          check: "date_logic",
          status: "fail",
          detail: `Due date (${dueDate}) is before the document date (${documentDate}) - likely a scan error.`,
        })
      } else {
        riskChecks.push({ check: "date_logic", status: "pass", detail: "Due date is on or after the document date." })
      }
    } else {
      riskChecks.push({ check: "date_logic", status: "pass", detail: "No due date to check." })
    }

    if (rawSubtotal > 0 && rawTax >= 0 && rawTotal > 0) {
      const expected = rawSubtotal + rawTax
      const diff = Math.abs(expected - rawTotal)
      if (diff > 0.05) {
        riskChecks.push({
          check: "math_consistency",
          status: "warning",
          detail: `Subtotal + tax (${expected.toFixed(2)}) doesn't match the stated total (${rawTotal.toFixed(2)}).`,
        })
      } else {
        riskChecks.push({ check: "math_consistency", status: "pass", detail: "Subtotal + tax matches the total." })
      }
    } else {
      riskChecks.push({ check: "math_consistency", status: "pass", detail: "Not enough data to check subtotal/tax/total math." })
    }

    if (vendorName && total > 0) {
      const { data: pastExpenses } = await supabase
        .from("expenses")
        .select("total")
        .eq("business_id", businessId)
        .ilike("vendor_name", vendorName)
        .not("total", "is", null)
        .limit(20)

      const pastTotals = (pastExpenses || []).map((e) => Number(e.total)).filter((n) => n > 0)
      if (pastTotals.length >= 2) {
        const avg = pastTotals.reduce((a, b) => a + b, 0) / pastTotals.length
        const pctDiff = ((total - avg) / avg) * 100
        if (pctDiff > 50) {
          riskChecks.push({
            check: "amount_anomaly",
            status: "warning",
            detail: `${total.toFixed(2)} is ${Math.round(pctDiff)}% higher than this vendor's usual ${avg.toFixed(2)} average.`,
          })
        } else {
          riskChecks.push({ check: "amount_anomaly", status: "pass", detail: `In line with this vendor's usual spending (avg ${avg.toFixed(2)}).` })
        }
      } else {
        riskChecks.push({ check: "amount_anomaly", status: "pass", detail: "Not enough history with this vendor yet to compare." })
      }
    } else {
      riskChecks.push({ check: "amount_anomaly", status: "pass", detail: "No vendor/amount to compare." })
    }

    const extracted = {
      vendor_name: vendorName,
      document_number: documentNumber,
      document_date: documentDate,
      due_date: dueDate,
      subtotal: rawSubtotal,
      tax_total: rawTax,
      total,
      amount_due: amountDue,
      amount_paid: amountPaid,
      currency: detectedCurrency,
      currency_supported: currencySupported,
      currency_full_support: fullSupport,
      tax_label: taxLabel,
      bill_to_name: rawBillToName,
      bill_to_address: billToAddress,
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
  ? `2. payment_status is already determined to be "${ruleBasedPaymentStatus}" from the numbers - just echo that value back exactly, don't recompute it.`
  : `2. Determine payment_status ("paid" or "unpaid") - the numbers here are ambiguous, use your best judgment.`}
3. Two specific risk judgment calls only (deterministic checks like duplicates, math, dates, and currency are already handled separately - do NOT repeat them):
   - bill_to_check: does bill_to_name look like it genuinely matches "${businessName || "the business scanning this"}"? If bill_to_name is present and clearly refers to a different person or company, status "fail" - it may mean this document doesn't belong to this business. If bill_to_name is missing or matches, status "pass".
   - round_amount_check: is the total suspiciously round (e.g. exactly $500.00, $1000.00) in a way that's unusual for a real invoice from this type of vendor? Real invoices usually have odd cents. If suspicious, status "warning", else "pass".

Respond with ONLY valid JSON, no other text, in this exact shape:
{"category": "...", "payment_status": "...", "bill_to_check": {"status": "pass" or "fail", "detail": "..."}, "round_amount_check": {"status": "pass" or "warning", "detail": "..."}}`

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
      classification = {
        category: "Other",
        payment_status: ruleBasedPaymentStatus || "unknown",
        bill_to_check: { status: "pass", detail: "Could not evaluate - Claude response was unparseable." },
        round_amount_check: { status: "pass", detail: "Could not evaluate - Claude response was unparseable." },
      }
    }

    riskChecks.push({
      check: "bill_to_match",
      status: classification.bill_to_check?.status === "fail" ? "fail" : "pass",
      detail: classification.bill_to_check?.detail || "Bill-to name looks consistent.",
    })
    riskChecks.push({
      check: "round_amount",
      status: classification.round_amount_check?.status === "warning" ? "warning" : "pass",
      detail: classification.round_amount_check?.detail || "Amount doesn't look unusually round.",
    })

    const failCount = riskChecks.filter((c) => c.status === "fail").length
    const warningCount = riskChecks.filter((c) => c.status === "warning").length
    const passCount = riskChecks.filter((c) => c.status === "pass").length
    const riskScore = Math.round((passCount / riskChecks.length) * 100)

    const isFlagged = failCount > 0 || warningCount > 0
    const firstIssue = riskChecks.find((c) => c.status === "fail") || riskChecks.find((c) => c.status === "warning")

    return new Response(
      JSON.stringify({
        ...extracted,
        confidence_score: avgConfidence,
        category: classification.category,
        payment_status: ruleBasedPaymentStatus || classification.payment_status,
        risk_checks: riskChecks,
        risk_score: riskScore,
        is_flagged: isFlagged,
        flag_reason: firstIssue?.detail || null,
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


