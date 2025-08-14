import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  // --- PHẦN KIỂM TRA "VÉ VÀO CỬA" (TOKEN) ---
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Yêu cầu không được xác thực.' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET); // Kiểm tra vé có hợp lệ không
  } catch (error) {
    return res.status(401).json({ message: 'Vé vào cửa không hợp lệ hoặc đã hết hạn.' });
  }
  // --- KẾT THÚC PHẦN KIỂM TRA "VÉ" ---

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const GITHUB_OWNER = 'tietkiem';
  const GITHUB_REPO = 'phongtro';
  const FILE_PATH = 'data.json';
  const GITHUB_TOKEN = process.env.GITHUB_PAT;

  try {
    const newListings = req.body;
    const newListingsJSON = JSON.stringify(newListings, null, 2);

    // ... (Phần logic gọi API GitHub giữ nguyên như cũ)
    const fileInfoUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const fileInfoRes = await fetch(fileInfoUrl, { headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' } });
    if (!fileInfoRes.ok && fileInfoRes.status !== 404) { throw new Error(`Không thể lấy thông tin file từ GitHub.`); }
    const fileInfo = fileInfoRes.status === 404 ? {} : await fileInfoRes.json();
    const currentSha = fileInfo.sha;
    const contentEncoded = Buffer.from(newListingsJSON).toString('base64');
    const updateUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const updateRes = await fetch(updateUrl, { method: 'PUT', headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `[Automated] Cap nhat du lieu luc ${new Date().toISOString()}`, content: contentEncoded, sha: currentSha }) });
    if (!updateRes.ok) { const errorData = await updateRes.json(); throw new Error(`Lỗi từ GitHub API: ${errorData.message}`); }
    const result = await updateRes.json();
    return res.status(200).json({ message: 'Cập nhật dữ liệu lên GitHub thành công!', data: result });

  } catch (error) {
    console.error('Lỗi trong quá trình xuất bản:', error);
    return res.status(500).json({ message: `Đã xảy ra lỗi phía server: ${error.message}` });
  }
}