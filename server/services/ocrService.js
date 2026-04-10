const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-poppler');

class OCRService {

  // ==========================
  // 🔥 MAIN ENTRY
  // ==========================
  async extractText(filePath, fileType) {
    try {
      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.pdf') {
        return await this.extractFromPDF(filePath);
      } else {
        return await this.extractFromImage(filePath);
      }
    } catch (error) {
      console.error('OCR extraction error:', error.message);
      throw new Error(`OCR failed: ${error.message}`);
    }
  }

  // ==========================
  // 📄 PDF HANDLING
  // ==========================
  async extractFromPDF(filePath) {
    try {
      console.log("[OCR] Trying pdf-parse...");

      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      const text = data.text.trim();

      // ✅ If text found → return
      if (text && text.length > 50) {
        return {
          text,
          method: 'pdf-parse',
          confidence: 95
        };
      }

      console.log("⚠️ Scanned PDF detected → converting to images...");

      return await this.convertPDFToImagesAndOCR(filePath);

    } catch (error) {
      console.error("PDF parse failed → fallback OCR:", error.message);
      return await this.convertPDFToImagesAndOCR(filePath);
    }
  }

  // ==========================
  // 🔁 PDF → IMAGE → OCR
  // ==========================
  async convertPDFToImagesAndOCR(filePath) {
    const outputDir = path.dirname(filePath);

    const opts = {
      format: "png",
      out_dir: outputDir,
      out_prefix: "page",
      page: null, // 🔥 all pages
    };

    await pdf.convert(filePath, opts);

    // 🔥 Read all generated images
    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith("page") && f.endsWith(".png"));

    let finalText = "";
    let totalConfidence = 0;

    for (let i = 0; i < files.length; i++) {
      const imagePath = path.join(outputDir, files[i]);

      console.log(`[OCR] Processing page ${i + 1}...`);

      const result = await this.extractFromImage(imagePath);

      finalText += "\n" + result.text;
      totalConfidence += result.confidence || 0;

      // 🧹 optional: delete temp image
      fs.unlinkSync(imagePath);
    }

    return {
      text: finalText.trim(),
      method: 'pdf-ocr',
      confidence: files.length ? totalConfidence / files.length : 70
    };
  }

  // ==========================
  // 🖼 IMAGE OCR
  // ==========================
  async extractFromImage(filePath) {
    try {
      const result = await Tesseract.recognize(filePath, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            process.stdout.write(`\rOCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      console.log(`\nOCR done. Confidence: ${result.data.confidence}%`);

      return {
        text: result.data.text.trim(),
        method: 'tesseract',
        confidence: result.data.confidence
      };

    } catch (error) {
      throw new Error(`Tesseract OCR failed: ${error.message}`);
    }
  }

  // ==========================
  // ❓ Q&A PARSER
  // ==========================
  parseQuestionsAndAnswers(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    const questions = [];
    const answers = [];

    let currentQuestion = null;
    let currentAnswer = [];

    const questionPattern = /^(?:Q\.?\s*)?(\d+)[.)\s]/i;

    for (let line of lines) {
      const match = line.match(questionPattern);

      if (match) {
        if (currentQuestion !== null) {
          answers.push({
            questionNumber: currentQuestion,
            text: currentAnswer.join(" ")
          });
        }

        currentQuestion = questions.length + 1;

        questions.push({
          number: currentQuestion,
          text: line
        });

        currentAnswer = [];
      } else {
        if (currentQuestion !== null) {
          currentAnswer.push(line);
        }
      }
    }

    if (currentQuestion !== null) {
      answers.push({
        questionNumber: currentQuestion,
        text: currentAnswer.join(" ")
      });
    }

    // fallback
    if (questions.length === 0) {
      questions.push({ number: 1, text: "General Response" });
      answers.push({ questionNumber: 1, text });
    }

    return { questions, answers };
  }

  // ==========================
  // 🧹 CLEAN TEXT
  // ==========================
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

module.exports = new OCRService();