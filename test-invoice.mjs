import { generateInvoiceFromAnuncios } from "./server/invoice-generator.ts";

// Test with 3 OPIOIDES ads
const testIds = [300001, 300002, 300003];
console.log("Testing invoice generation with IDs:", testIds);

try {
  const url = await generateInvoiceFromAnuncios(testIds, "Test Invoice", "Testing cost calculation");
  console.log("✅ Invoice generated successfully!");
  console.log("URL:", url);
} catch (error) {
  console.error("❌ Error:", error.message);
}
