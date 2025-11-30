import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { ImageFile } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeStyleImage = async (styleImage: ImageFile): Promise<{ outfit: string, background: string }> => {
  try {
    const model = 'gemini-2.5-flash';
    const imagePart = {
      inlineData: {
        data: styleImage.base64,
        mimeType: styleImage.mimeType,
      },
    };
    const textPart = {
      text: "Bạn là một chuyên gia phân tích thời trang và bối cảnh. Hãy phân tích hình ảnh được cung cấp một cách cực kỳ chi tiết. Đối với 'outfit', hãy mô tả từng món đồ, chất liệu vải (ví dụ: lụa, cotton, denim), kiểu dáng, hoa văn, màu sắc chủ đạo và các chi tiết nhỏ như cúc áo, đường may. Đối với 'background', hãy mô tả không gian, ánh sáng (ví dụ: ánh sáng tự nhiên, đèn studio), các vật thể xung quanh, tông màu chung và cảm giác mà nó mang lại (ví dụ: sang trọng, cổ điển, tự nhiên). Tuyệt đối không mô tả người. Trả về kết quả dưới dạng một đối tượng JSON với hai khóa: 'outfit' và 'background'.",
    };

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            outfit: {
              type: Type.STRING,
              description: 'Mô tả chi tiết về trang phục trong ảnh.',
            },
            background: {
              type: Type.STRING,
              description: 'Mô tả chi tiết về bối cảnh, môi trường xung quanh trong ảnh.',
            },
          },
        },
      },
    });

    let jsonStr = response.text.trim();
    // Clean potential markdown formatting
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
    }
    const parsed = JSON.parse(jsonStr);
    return parsed;

  } catch (error) {
    console.error("Lỗi phân tích ảnh phong cách:", error);
    throw new Error("Không thể phân tích ảnh. Vui lòng thử lại.");
  }
};


export const generateImageVariation = async (
  sourceImage: ImageFile,
  prompts: { outfit: string, background: string },
  aspectRatio: string,
  cameraAngle: string,
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash-image';

    const textPrompt = `
      **Nhiệm vụ: Cấy ghép kỹ thuật số - Chỉ thay đổi trang phục và bối cảnh.**

      **QUY TẮC BẮT BUỘC:**
      1.  **GIỮ NGUYÊN 100% NGƯỜI GỐC:** Giữ lại chính xác người trong ảnh gốc: khuôn mặt, nét mặt, kiểu tóc, màu tóc, màu da, dáng người. KHÔNG ĐƯỢC THAY ĐỔI.
      2.  **XỬ LÝ NỀN XANH (YÊU CẦU TUYỆT ĐỐI):** Hình ảnh đầu vào có một nền màu xanh lá cây sáng (#00FF00) bao quanh. Nhiệm vụ của bạn là phải **XÓA SẠCH** và **THAY THẾ HOÀN TOÀN** 100% vùng màu xanh này bằng bối cảnh được mô tả. Đây là yêu cầu quan trọng nhất. **KHÔNG ĐƯỢC PHÉP** để lại bất kỳ pixel màu xanh nào trong ảnh kết quả. Toàn bộ khung hình phải được lấp đầy.
      3.  **THAY ĐỔI:** Chỉ thay đổi trang phục và bối cảnh dựa trên mô tả dưới đây.
      4.  **TỈ LỆ KHUNG HÌNH:** Tạo ra hình ảnh với tỉ lệ khung hình chính xác là ${aspectRatio}.
      5.  **GÓC CHỤP:** Chụp ảnh từ góc ${cameraAngle}.
      6.  **CHẤT LƯỢNG:** Hình ảnh phải siêu thực, chất lượng 4K, chi tiết và sắc nét.

      **Mô tả chi tiết:**
      -   **Trang phục:** ${prompts.outfit}
      -   **Bối cảnh:** ${prompts.background}

      **ĐẦU RA:** Chỉ trả về duy nhất một tệp hình ảnh. Không trả về bất kỳ văn bản nào.
    `;

    const imagePart = {
      inlineData: {
        data: sourceImage.base64,
        mimeType: sourceImage.mimeType,
      },
    };

    const textPart = { text: textPrompt };

    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
          return part.inlineData.data;
        }
      }
    }
    
    // Handle cases where the model returns text instead of an image
    if (response.text) {
        throw new Error(`AI trả về tin nhắn văn bản thay vì ảnh: "${response.text}"`);
    }
    
    // Handle safety blocks or other issues
    const blockReason = response.candidates?.[0]?.finishReason;
    if (blockReason && blockReason !== 'STOP') {
        throw new Error(`Bị chặn bởi lý do an toàn hoặc lỗi khác: ${blockReason}`);
    }

    throw new Error("Không có ảnh nào được tạo trong phản hồi.");

  } catch (error) {
    console.error("Lỗi tạo biến thể ảnh:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("Một lỗi không xác định đã xảy ra khi tạo ảnh.");
  }
};