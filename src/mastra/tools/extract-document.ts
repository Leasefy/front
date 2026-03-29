import { createTool } from '@mastra/core/tools'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const anthropic = new Anthropic()

const EXTRACTION_PROMPTS: Record<string, string> = {
  cedula: `Analiza esta imagen de una cédula de ciudadanía colombiana (CC) o cédula de extranjería (CE).
Extrae los siguientes campos en JSON:
- numero: string (número del documento)
- nombreCompleto: string (nombre y apellidos)
- fechaNacimiento: string (formato YYYY-MM-DD si visible)
- fechaExpedicion: string (formato YYYY-MM-DD si visible)
- lugarExpedicion: string (ciudad/departamento)
- sexo: string (M/F si visible)
- tipoDocumento: string (CC o CE)

Si un campo no es legible, usa null. No inventes datos.
Responde SOLO con el JSON, sin markdown ni texto adicional.`,

  certificacion_laboral: `Analiza esta imagen de una certificación laboral colombiana.
Extrae los siguientes campos en JSON:
- empresa: string (nombre de la empresa)
- nit: string (NIT de la empresa si visible)
- cargo: string (cargo/posición)
- salarioMensual: number (salario en COP, solo el número sin puntos ni comas)
- fechaIngreso: string (formato YYYY-MM-DD)
- tipoContrato: string (indefinido/fijo/prestacion_servicios/otro)
- fechaExpedicion: string (fecha del certificado YYYY-MM-DD)
- firmadoPor: string (nombre de quien firma)

Si un campo no es legible, usa null. No inventes datos.
Responde SOLO con el JSON, sin markdown ni texto adicional.`,

  extracto_bancario: `Analiza esta imagen de un extracto bancario colombiano.
Extrae los siguientes campos en JSON:
- banco: string (nombre del banco)
- numeroCuenta: string (número de cuenta, parcialmente visible está bien)
- tipoCuenta: string (ahorros/corriente)
- periodo: string (mes/año del extracto)
- saldoInicial: number (en COP, solo número)
- saldoFinal: number (en COP, solo número)
- totalIngresos: number (total consignaciones/abonos en COP)
- totalEgresos: number (total retiros/débitos en COP)
- promedioSaldo: number (promedio si está disponible, sino null)

Si un campo no es legible, usa null. No inventes datos.
Responde SOLO con el JSON, sin markdown ni texto adicional.`,

  otro: `Analiza esta imagen de documento y extrae toda la información relevante que puedas identificar.
Responde en JSON con los campos que encuentres.
Si un campo no es legible, usa null. No inventes datos.
Responde SOLO con el JSON, sin markdown ni texto adicional.`,
}

export const extractDocumentTool = createTool({
  id: 'extract-document',
  description:
    'Extracts text and structured data from documents (cédula, certificación laboral, extractos bancarios) using Claude Vision OCR.',
  inputSchema: z.object({
    documentUrl: z.string().url().describe('URL of the document image or PDF'),
    documentType: z
      .enum(['cedula', 'certificacion_laboral', 'extracto_bancario', 'otro'])
      .describe('Type of document to extract'),
    applicationId: z.string().describe('ID of the rental application'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    documentType: z.string(),
    extractedData: z.record(z.unknown()),
    confidence: z.number().min(0).max(1),
    rawText: z.string(),
    error: z.string().optional(),
  }),
  execute: async ({ documentUrl, documentType, applicationId }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[extract-document] Processing ${documentType} for application ${applicationId}`,
      )
    }

    try {
      const prompt = EXTRACTION_PROMPTS[documentType] ?? EXTRACTION_PROMPTS.otro

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'url', url: documentUrl },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      })

      const textBlock = response.content.find((b) => b.type === 'text')
      const rawText = textBlock?.type === 'text' ? textBlock.text : ''

      // Parse the JSON response
      let extractedData: Record<string, unknown> = {}
      try {
        // Handle potential markdown wrapping
        const jsonStr = rawText.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
        extractedData = JSON.parse(jsonStr)
      } catch {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[extract-document] Failed to parse JSON, returning raw text')
        }
        return {
          success: false,
          documentType,
          extractedData: {},
          confidence: 0,
          rawText,
          error: 'Failed to parse structured data from document',
        }
      }

      // Calculate confidence based on how many fields were extracted vs null
      const values = Object.values(extractedData)
      const nonNullCount = values.filter((v) => v !== null && v !== '').length
      const confidence = values.length > 0 ? nonNullCount / values.length : 0

      return {
        success: true,
        documentType,
        extractedData,
        confidence: Math.round(confidence * 100) / 100,
        rawText,
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      if (process.env.NODE_ENV === 'development') {
        console.error('[extract-document] Error:', errorMessage)
      }

      return {
        success: false,
        documentType,
        extractedData: {},
        confidence: 0,
        rawText: '',
        error: errorMessage,
      }
    }
  },
})
