import { useState } from 'react';
import { Mail } from 'lucide-react';
import { sendEmail } from '@/lib/email';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await sendEmail({
        to: 'editorial@tjasf.com',
        subject: `TJASF Contact Form Inquiry: ${subject}`,
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #27334a; max-width: 600px; margin: 0 auto; border: 1px solid #e6e5e0; padding: 24px; border-radius: 8px;">
            <h2 style="color: #102342; border-bottom: 2px solid #eb5526; padding-bottom: 8px;">New Contact Inquiry</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <div style="background-color: #fbfaf8; border: 1px solid #e6e5e0; padding: 16px; margin: 16px 0; border-radius: 6px;">
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
            <p style="margin-top: 24px; font-size: 12px; color: #667082; border-top: 1px solid #f1f0ec; padding-top: 12px;">
              <strong>TJASF Contact Form Service</strong>
            </p>
          </div>
        `
      });
      setSent(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      console.error(err);
      alert('Failed to send message. Please try again later.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-[1160px] mx-auto px-8 py-20">
      <div className="text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold mb-4">Contact</div>
      <h1 className="font-['Playfair_Display'] font-medium text-[clamp(36px,5vw,56px)] leading-[1.08] text-[#102342] mb-4">
        Get in touch with TJASF.
      </h1>
      <p className="text-[#667082] text-lg max-w-[700px] mb-12">
        Have a question about submissions, peer review, or the journal? We're here to help.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-12">
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#f1f0ec] rounded-lg flex items-center justify-center text-[#eb5526] flex-shrink-0">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-[#102342] text-sm">Email</h3>
              <p className="text-[#667082] text-sm">editor@tjasf.com</p>
              <p className="text-[#667082] text-sm">editorial@tjasf.com</p>
            </div>
          </div>

        </div>

        <div>
          {sent && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-green-800 text-sm">
              Thank you for your message. We'll get back to you within 2-3 business days.
            </div>
          )}
          <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[#e6e5e0] p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1">Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1">Subject</label>
              <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1">Message</label>
              <textarea required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526] resize-none" />
            </div>
            <button type="submit" disabled={sending} className="px-6 py-3 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c] transition-colors disabled:opacity-50 cursor-pointer">
              {sending ? 'Sending Message...' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
