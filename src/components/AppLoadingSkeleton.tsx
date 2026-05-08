export default function AppLoadingSkeleton() {
     return (
       <div className="pa-phone-wrapper">
         <div className="pa-phone">
           <div className="pa-phone-notch" />
           <div className="pa-screen">
             <div style={{ padding: '60px 24px 0' }}>
               <div style={{
                 width: 120, height: 14, background: 'var(--pa-soft)',
                 borderRadius: 8, marginBottom: 16,
                 animation: 'pa-skeleton 1.4s ease-in-out infinite',
               }} />
               <div style={{
                 width: '70%', height: 32, background: 'var(--pa-soft)',
                 borderRadius: 8, marginBottom: 32,
                 animation: 'pa-skeleton 1.4s ease-in-out infinite',
               }} />
               {[0, 1, 2].map(i => (
                 <div key={i} style={{
                   height: 110, background: 'var(--pa-soft)',
                   borderRadius: 16, marginBottom: 12,
                   animation: 'pa-skeleton 1.4s ease-in-out infinite',
                   animationDelay: `${i * 0.1}s`,
                 }} />
               ))}
             </div>
           </div>
         </div>
       </div>
     );
   }
