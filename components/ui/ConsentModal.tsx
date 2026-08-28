'use client';

import React, { useState } from 'react';
import { ShieldCheck, CheckCircle } from 'lucide-react';

const ConsentModal = ({ onAgree, onCancel }: { onAgree: () => void, onCancel: () => void }) => {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">นโยบายการคุ้มครองข้อมูลส่วนบุคคล</h2>
        </div>
        
        <div className="p-6 overflow-y-auto text-sm text-gray-600 space-y-4 leading-relaxed custom-scrollbar">
           <p><strong>1.</strong> นโยบายฉบับนี้สืบเนื่องมาจาก เมื่อวันที่ 28 พฤษภาคม 2562 มีผลบังคับใช้ พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 เพื่อเป็นการคุ้มครองข้อมูลส่วนบุคคลและการปฏิบัติตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล</p>
           <p><strong>2.</strong> ทางศูนย์ CCTV เทศบาลตำบลราไวย์ จัดเก็บข้อมูล เบื้องต้นพอสังเขป อาทิ ภาพบัตรประชาชนรวมถึงข้อมูลหน้าบัตร ให้สามารถระบุการมีตัวตนของผู้ที่มาติดต่อราชการเพื่อเป็นไปตามความถูกต้องในขั้นตอนการขอข้อมูลจากทางศูนย์</p>
           <p><strong>3.</strong> ข้อมูลที่ศูนย์ควบคุมและสั่งการระบบ CCTV เทศบาลตำบลราไวย์ ได้จัดเก็บจากแบบฟอร์มฉบับนี้ เพื่อเป็นการเก็บรวบรวมหลักฐานในการขอใช้บริการ ในการเข้าถึงข้อมูลภาพจากระบบกล้อง CCTV ของหน่วยงานเทศบาลตำบลราไวย์ และใช้ในการวิเคราะห์การใช้งานระบบ เพื่อพัฒนาโครงสร้างและระบบงานต่อไปเพียงเท่านั้น</p>
           <p><strong>4.</strong> ข้อมูลที่ได้ไม่มีการเผยแพร่ต่อเพื่อผลประโยชน์อื่นใดอันเป็นอำนาจนอกเหนือจากงานราชการที่เจ้าของข้อมูลได้มาติดต่อและยินยอมให้ข้อมูล</p>
           <p><strong>5.</strong> ข้อมูลที่ได้จะมีการจัดเก็บไว้ในระบบ จนกว่าจะครบกำหนดที่ได้ระบุไว้ใน ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ (ฉบับที่ 4). พ.ศ. 2564</p>
           <p><strong>6.</strong> หากผู้เป็นเจ้าของข้อมูลต้องการใช้สิทธิในการเป็นเจ้าของ อย่างเช่นการเพิกถอนข้อมูลที่ได้ให้ไว้หากเป็นเหตุอันควรสามารถกระทำได้</p>
           <p><strong>7.</strong> ทั้งนี้ทางเจ้าหน้าที่จะมีการเพิ่มเนื้อหาให้ข้อมูลเป็นปัจจุบัน หากมีการปรับปรุงหรือแก้ไขนโยบายการคุ้มครองข้อมูลส่วนบุคคล (Privacy Policy)</p>
           <p><strong>8.</strong> หากท่านมีข้อเสนอแนะ หรือต้องการสอบถามข้อมูลเกี่ยวกับรายละเอียดการเก็บรวบรวม สามารถติดต่อได้ที่ ศูนย์ควบคุมและสั่งการระบบ CCTV ประจำสำนักงานเทศบาลตำบลราไวย์</p>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <label className="flex items-center gap-3 mb-6 cursor-pointer group select-none">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                {checked && <CheckCircle className="w-3.5 h-3.5 text-white" />}
            </div>
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => setChecked(e.target.checked)} />
            <span className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">ข้าพเจ้าได้อ่านแล้วและยินยอมเปิดเผยข้อมูล</span>
          </label>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-white hover:border-gray-300 transition-all">ยกเลิก</button>
            <button
                onClick={onAgree}
                disabled={!checked}
                className="flex-1 px-4 py-3 bg-blue-600 rounded-xl text-white font-medium hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform active:scale-[0.98]"
            >
                ยืนยันและดำเนินการต่อ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentModal;