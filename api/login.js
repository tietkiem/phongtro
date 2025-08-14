import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  // Chỉ cho phép phương thức POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Lấy username và password từ request người dùng gửi lên
  const { username, password } = req.body;

  // Lấy thông tin đúng từ Biến Môi trường đã lưu trên Vercel
  const correctUsername = process.env.ADMIN_USERNAME;
  const correctPassword = process.env.ADMIN_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  // Kiểm tra thông tin
  if (username === correctUsername && password === correctPassword) {
    // Nếu đúng, tạo "vé vào cửa" (token) có hiệu lực trong 8 giờ
    const token = jwt.sign({ username: username }, jwtSecret, { expiresIn: '8h' });
    
    // Gửi "vé" về cho trình duyệt
    return res.status(200).json({ success: true, token: token });
  } else {
    // Nếu sai, báo lỗi
    return res.status(401).json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
  }
}