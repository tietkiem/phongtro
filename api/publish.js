// Sử dụng cú pháp module.exports - tương thích nhất
module.exports = async (req, res) => {
  // Chỉ cho phép phương thức POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // Cấu hình kho chứa
  const GITHUB_OWNER = 'tietkiem';
  const GITHUB_REPO = 'phongtro';
  const FILE_PATH = 'data.json';
  const GITHUB_TOKEN = process.env.GITHUB_PAT;

  // Kiểm tra token
  if (!GITHUB_TOKEN) {
    console.error('LỖI CẤU HÌNH SERVER: Biến môi trường GITHUB_PAT chưa được cài đặt.');
    return res.status(500).json({ message: 'Lỗi cấu hình server: Thiếu GitHub Token.' });
  }

  try {
    const newListings = req.body;
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

    // 2. Mã hóa nội dung mới
    const contentEncoded = Buffer.from(newListingsJSON).toString('base64');

    // 3. Gửi yêu cầu cập nhật
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