export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const GITHUB_OWNER = 'tietkiem';
  const GITHUB_REPO = 'phongtro';
  const FILE_PATH = 'data.json';
  const GITHUB_TOKEN = process.env.GITHUB_PAT;

  if (!GITHUB_TOKEN) {
    console.error('LỖI CẤU HÌNH: Biến môi trường GITHUB_PAT chưa được cài đặt trên Vercel.');
    return res.status(500).json({ message: 'Lỗi cấu hình server: Thiếu GitHub Token.' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    let newListingsJSON = Buffer.concat(chunks).toString('utf8');

    // BƯỚC SỬA LỖI: Loại bỏ các ký tự Unicode không hợp lệ
    // Biểu thức chính quy này sẽ tìm và xóa các cặp surrogate không hợp lệ
    newListingsJSON = newListingsJSON.replace(/\\u[dD][8-9a-fA-F]{2,2}|\\u[dD][c-fC-F]{2,2}/g, '');


    const fileInfoUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const fileInfoRes = await fetch(fileInfoUrl, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}` },
    });
    
    if (!fileInfoRes.ok && fileInfoRes.status !== 404) {
      const errorBody = await fileInfoRes.text();
      throw new Error(`Không thể lấy thông tin file. Status: ${fileInfoRes.status}. Body: ${errorBody}`);
    }
    
    const fileInfo = fileInfoRes.status === 404 ? {} : await fileInfoRes.json();
    const currentSha = fileInfo.sha;

    const contentEncoded = Buffer.from(newListingsJSON).toString('base64');

    const updateUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const updateRes = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `[Automated] Cập nhật dữ liệu lúc ${new Date().toISOString()}`,
        content: contentEncoded,
        sha: currentSha,
      }),
    });

    if (!updateRes.ok) {
        const errorData = await updateRes.json();
        throw new Error(`GitHub API error: ${errorData.message}`);
    }

    const result = await updateRes.json();
    res.status(200).json({ message: 'Cập nhật dữ liệu lên GitHub thành công!', data: result });

  } catch (error) {
    console.error('Lỗi trong khối try...catch:', error);
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error.message}` });
  }
}