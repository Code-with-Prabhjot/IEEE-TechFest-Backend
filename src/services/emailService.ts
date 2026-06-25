import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use SSL to bypass standard port blocks
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    // This prevents cloud server certificate timeout errors
    rejectUnauthorized: false 
  }
});

export const sendTicketEmail = async (userEmail: string, eventName: string, ticketId: string, qrCode: string) => {
  const mailOptions = {
    from: `"IEEE NEXUS 2026" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `Your Ticket for ${eventName} | IEEE Nexus 2026`,
    html: `
      <div style="font-family: sans-serif; text-align: center; padding: 20px;">
        <h1 style="color: #8a2be2;">Registration Confirmed!</h1>
        <p>You are officially registered for <b>${eventName}</b>.</p>
        <p>Your Ticket ID: <b>${ticketId}</b></p>
        <img src="${qrCode}" alt="Ticket QR" style="width: 200px; margin: 20px 0; border: 2px solid #ff007a; padding: 10px;" />
        <p>Show this QR code at the gate to get admitted.</p>
        <p>See you at the summit!</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};