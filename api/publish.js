// Dòng này chỉ định Next.js không cần phân tích cú pháp body, chúng ta sẽ tự làm
export const config = {
  api: {
    bodyParser: false,
  },
};

// Hàm chính xử lý yêu cầu
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Cấu hình thông tin kho chứa của bạn
  const GITHUB_OWNER = 'tietkiem'; // << THAY BẰNG TÊN USER GITHUB CỦA BẠN
  const GITHUB_REPO = 'phongtro';       // << THAY BẰNG TÊN KHO CHỨA CỦA BẠN
  const FILE_PATH = 'data.json';
  const GITHUB_TOKEN = process.env.GITHUB_PAT; // Lấy token từ biến môi trường đã cài ở Vercel

  try {
    // Đọc dữ liệu mới từ request
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const newListingsJSON = Buffer.concat(chunks).toString('utf8');

    // 1. Lấy SHA của file hiện tại trên GitHub (bắt buộc để cập nhật)
    const fileInfoUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const fileInfoRes = await fetch(fileInfoUrl, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}` },
    });

    if (!fileInfoRes.ok && fileInfoRes.status !== 404) {
      throw new Error(`Không thể lấy thông tin file từ GitHub. Status: ${fileInfoRes.status}`);
    }
    
    const fileInfo = fileInfoRes.status === 404 ? {} : await fileInfoRes.json();
    const currentSha = fileInfo.sha;

    // 2. Mã hóa nội dung mới sang Base64
    const contentEncoded = Buffer.from(newListingsJSON).toString('base64');

    // 3. Gửi yêu cầu cập nhật file lên GitHub
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
        sha: currentSha, // Cung cấp SHA của file cũ
      }),
    });

    if (!updateRes.ok) {
        const errorData = await updateRes.json();
        throw new Error(`GitHub API error: ${errorData.message}`);
    }

    const result = await updateRes.json();
    res.status(200).json({ message: 'Cập nhật dữ liệu lên GitHub thành công!', data: result });

  } catch (error) {
    console.error('Lỗi khi cập nhật file:', error);
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error.message}` });
  }
}