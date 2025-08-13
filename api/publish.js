export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  console.log('Function /api/publish được gọi.');

  if (req.method !== 'POST') {
    console.error('Lỗi: Phương thức không hợp lệ. Chỉ chấp nhận POST.');
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const GITHUB_OWNER = 'tietkiem'; // << THAY BẰNG TÊN USER GITHUB CỦA BẠN
  const GITHUB_REPO = 'phongtro';       // << THAY BẰNG TÊN KHO CHỨA CỦA BẠN
  const FILE_PATH = 'data.json';
  const GITHUB_TOKEN = process.env.GITHUB_PAT;

  if (!GITHUB_TOKEN) {
    console.error('LỖI NGHIÊM TRỌNG: Biến môi trường GITHUB_PAT chưa được cài đặt trên Vercel.');
    return res.status(500).json({ message: 'Lỗi cấu hình server: Thiếu GitHub Token.' });
  }
  console.log('Đã đọc thông tin cấu hình và PAT.');

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const newListingsJSON = Buffer.concat(chunks).toString('utf8');
    console.log('Đã nhận và xử lý xong dữ liệu mới từ request.');

    const fileInfoUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    console.log(`Đang lấy thông tin file từ: ${fileInfoUrl}`);
    
    const fileInfoRes = await fetch(fileInfoUrl, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}` },
    });
    
    console.log(`Phản hồi từ GitHub khi lấy thông tin file: ${fileInfoRes.status}`);
    if (!fileInfoRes.ok && fileInfoRes.status !== 404) {
      const errorBody = await fileInfoRes.text();
      throw new Error(`Không thể lấy thông tin file. Status: ${fileInfoRes.status}. Body: ${errorBody}`);
    }
    
    const fileInfo = fileInfoRes.status === 404 ? {} : await fileInfoRes.json();
    const currentSha = fileInfo.sha;
    console.log(`SHA hiện tại của file là: ${currentSha || 'Không có (file mới)'}`);

    const contentEncoded = Buffer.from(newListingsJSON).toString('base64');
    console.log('Đã mã hóa nội dung mới sang Base64.');

    const updateUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    console.log(`Đang gửi yêu cầu cập nhật tới: ${updateUrl}`);
    
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

    console.log(`Phản hồi từ GitHub khi cập nhật file: ${updateRes.status}`);
    if (!updateRes.ok) {
        const errorData = await updateRes.json();
        throw new Error(`GitHub API error: ${errorData.message}`);
    }

    const result = await updateRes.json();
    console.log('Xuất bản thành công!');
    res.status(200).json({ message: 'Cập nhật dữ liệu lên GitHub thành công!', data: result });

  } catch (error) {
    console.error('Lỗi trong khối try...catch:', error);
    res.status(500).json({ message: `Đã xảy ra lỗi: ${error.message}` });
  }
}