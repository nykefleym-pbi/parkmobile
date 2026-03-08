import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ArrowLeft } from 'lucide-react';

export default function HelpScreen() {
  const { config, setActiveTab, setScreen } = useApp();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const faqs = [
    { q: "How do I reserve a parking slot?", a: "Navigate to the Search tab and select your preferred parking space. Tap on any available slot, choose the vehicle you would like to assign, and confirm your reservation." },
    { q: "What is the monthly parking fee?", a: "The monthly parking fee varies per space and is displayed on each parking area's detail page. The fee covers a 30-day period." },
    { q: "Can I cancel my booking after paying?", a: "Once a payment has been recorded, your booking can no longer be cancelled. Your slot will remain reserved until the paid amount is fully consumed." },
    { q: "What happens if my vehicle overstays?", a: "If your vehicle remains parked beyond the end of your reserved period, the HOA may apply an overstay penalty calculated at the prorated daily rate." },
    { q: "How will I know if my payment has been processed?", a: "Once the HOA office records your payment, a digital receipt will appear on your booking card in the Bookings tab." },
    { q: "Who is eligible to use this parking service?", a: `This parking service is available exclusively to verified residents, renters, and authorized individuals within ${config.subdiv}.` },
  ];

  return (
    <div className="pa-screen-content">
      <div className="pa-sbar" />
      <div style={{ padding: '0 24px 14px' }}>
        <button className="pa-back pa-fu" onClick={() => { setActiveTab('profile'); setScreen('home'); }}>
          <ArrowLeft size={18} /> Back
        </button>
      </div>
      <div className="pa-hdr pa-fu pa-d1" style={{ paddingTop: 0 }}>
        <h1>Help & <span className="pa-serif">Support</span></h1>
        <p>We're here to assist you.</p>
      </div>
      <div className="pa-help-contact pa-fu pa-d2">
        <h4>Contact Admin Office</h4>
        <p>Phone: <span>{config.hoa.phone}</span></p>
        <p>Email: <span>{config.hoa.email}</span></p>
        <p>Hours: <span>{config.hoa.hours}</span></p>
      </div>
      <div className="pa-slbl pa-fu pa-d3" style={{ marginTop: 8 }}>Frequently Asked Questions</div>
      {faqs.map((f, i) => (
        <div key={i} className={`pa-faq-item pa-fu pa-d${Math.min(i + 3, 5)}`}>
          <div className={`pa-faq-q ${openIdx === i ? 'open' : ''}`} onClick={() => setOpenIdx(openIdx === i ? null : i)}>
            <span>{f.q}</span>
            <svg className="pa-faq-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </div>
          <div className={`pa-faq-a ${openIdx === i ? 'open' : ''}`}>
            <div className="pa-faq-a-inner">{f.a}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
