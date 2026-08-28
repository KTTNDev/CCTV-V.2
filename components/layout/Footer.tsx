import React from 'react';
import { Building2, PhoneCall } from 'lucide-react';

const Footer = () => (
  <footer className="bg-gray-50 border-t border-gray-200 pt-16 pb-8">
    <div className="max-w-6xl mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold group-hover:bg-blue-700 transition-colors shadow-sm">
                   <img  src="https://rawaicity.app/__images/banner.png" alt="" />

            </div>
            <span className="font-bold text-xl text-gray-900">CCTV Service</span>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">
            ระบบบริการประชาชนออนไลน์ ด้านการขอข้อมูลภาพกล้องวงจรปิด<br/>
            เพื่ออำนวยความสะดวก รวดเร็ว และโปร่งใส
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-gray-900">ติดต่อเรา</h4>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
              <span>ศูนย์ควบคุมและสั่งการระบบ CCTV<br/>เทศบาลตำบลราไวย์</span>
            </li>
            <li className="flex items-center gap-3">
              <PhoneCall className="w-5 h-5 text-gray-400" />
              <span>076613801 (เทศบาลตำบลราไวย์)</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-gray-900">เวลาทำการ</h4>
          <p className="text-sm text-gray-600">
            จันทร์ - ศุกร์ : 08.30 - 16.30 น.<br/>
            (เว้นวันหยุดราชการ)
          </p>
          <p className="text-xs text-gray-400 mt-4">
            * ระบบออนไลน์เปิดให้บริการ 24 ชั่วโมง
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-8 text-center text-sm text-gray-400 flex flex-col md:flex-row justify-between items-center gap-4">
        <p>พัฒนาโดย ทีมฝ่ายนโยบายและแผน เทศบาลตำบลราไวย์</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-gray-600">นโยบายความเป็นส่วนตัว</a>
          <a href="#" className="hover:text-gray-600">ข้อตกลงการใช้งาน</a>
          <a href="#" className="hover:text-gray-600">ช่วยเหลือ</a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;