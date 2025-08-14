// Sử dụng cú pháp CommonJS (module.exports) thay vì ES Module (export default)
module.exports = async (req, res) => {
  // Chỉ cho phép phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Cấu hình kho chứa
  const GITHUB_OWNER = 'tietkiem';
  const GITHUB_REPO = 'phongtro';
  const FILE_PATH = 'data.json';
  const GITHUB_TOKEN = process.env.GITHUB_PAT;

  // Kiểm tra xem token đã được cài đặt trên Vercel chưa
  if (!GITHUB_TOKEN) {
    console.error('LỖI CẤU HÌNH: Biến môi trường GITHUB_PAT chưa được cài đặt.');
    return res.status(500).json({ message: 'Lỗi cấu hình server: Thiếu GitHub Token.' });
  }

  try {
    // Đọc dữ liệu JSON mới từ request. Vercel tự động phân tích cú pháp body.
    const newListings = req.body;

    // Chuyển đổi đối tượng JSON thành chuỗi có định dạng đẹp mắt
    const newListingsJSON = JSON.stringify(newListings, null, 2);

    // 1. Lấy SHA của file hiện tại trên GitHub
    const fileInfoUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const fileInfoRes = await fetch(fileInfoUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!fileInfoRes.ok && fileInfoRes.status !== 404) {
      const errorText = await fileInfoRes.text();
      throw new Error(`Không thể lấy thông tin file từ GitHub. Status: ${fileInfoRes.status}. Lỗi: ${errorText}`);
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
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `[Automated] Cap nhat du lieu luc ${new Date().toISOString()}`,
        content: contentEncoded,
        sha: currentSha,
      }),
    });

    if (!updateRes.ok) {
      const errorData = await updateRes.json();
      throw new Error(`Lỗi từ GitHub API: ${errorData.message}`);
    }

    const result = await updateRes.json();
    return res.status(200).json({ message: 'Cập nhật dữ liệu lên GitHub thành công!', data: result });

  } catch (error) {
    console.error('Lỗi trong quá trình xuất bản:', error);
    return res.status(500).json({ message: `Đã xảy ra lỗi phía server: ${error.message}` });
  }
};