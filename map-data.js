/*
 * ข้อมูล Label ทั้งหมดของแผนที่
 * x วัดจากซ้ายไปขวา และ y วัดจากบนลงล่าง หน่วยเป็นเปอร์เซ็นต์ของภาพ
 */
window.MAP_CONFIG = {
  imageUrl: "images/plant-map.jpg",
  imageWidth: 991,
  imageHeight: 637,
  apiUrl: "https://mwa-interactive-map-api.bitg-boardroom.workers.dev",
  googleMapsApiKey: "AIzaSyDzm4Pq1MkdIsxspNABAq-xsQy5NzV6rDM",
  center: { lat: 13.880619783012458, lng: 100.55486309758739 },
  initialZoom: 16,
  categories: {
    production: { label: "ระบบผลิตน้ำ", color: "#1769e0" },
    transmission: { label: "ระบบส่งน้ำ", color: "#00aeca" },
    civil: { label: "งานโยธา", color: "#f28a2e" },
    support: { label: "อาคารสนับสนุน", color: "#27a66a" }
  }
};

window.MAP_LABELS = [
  {
    id: "clarifier-01",
    label: "CLARIFIER",
    name: "ถังตกตะกอน (Clarifier)",
    lat: 13.882119783012458,
    lng: 100.55270309758739,
    category: "production",
    description: "พื้นที่สำหรับแยกตะกอนและสิ่งแขวนลอยออกจากน้ำในกระบวนการผลิตน้ำประปา",
    downloads: [
      { label: "แบบแปลนถังตกตะกอน (PDF)", url: "documents/clarifier-plan.pdf", sample: true },
      { label: "คู่มือการตรวจสอบ (PDF)", url: "documents/clarifier-inspection.pdf", sample: true }
    ]
  },
  {
    id: "filter-unit-01",
    label: "FILTER UNIT",
    name: "ระบบกรองน้ำ (Filter Unit)",
    lat: 13.880835783012458,
    lng: 100.55682309758739,
    category: "production",
    description: "หน่วยกรองน้ำเพื่อกำจัดอนุภาคขนาดเล็กก่อนเข้าสู่กระบวนการฆ่าเชื้อและจ่ายน้ำ",
    downloads: [
      { label: "ข้อมูลระบบกรองน้ำ (PDF)", url: "documents/filter-unit.pdf", sample: true }
    ]
  },
  {
    id: "sludge-lagoon-01",
    label: "SLUDGE LAGOON No.1",
    name: "บ่อพักตะกอน หมายเลข 1",
    lat: 13.877955783012458,
    lng: 100.56042309758739,
    category: "civil",
    description: "พื้นที่รองรับและพักตะกอนจากกระบวนการผลิตน้ำ เพื่อควบคุมและจัดการตะกอนอย่างเหมาะสม",
    downloads: [
      { label: "แผนผังบ่อพักตะกอน (PDF)", url: "documents/sludge-lagoon-01.pdf", sample: true }
    ]
  },
  {
    id: "raw-water-pump",
    label: "RAW WATER PUMP",
    name: "สถานีสูบน้ำดิบ",
    lat: 13.879479783012458,
    lng: 100.54856309758739,
    category: "transmission",
    description: "สถานีสูบน้ำดิบเข้าสู่ระบบผลิตน้ำของโรงงาน",
    downloads: [
      { label: "ข้อมูลสถานีสูบน้ำดิบ (PDF)", url: "documents/raw-water-pump.pdf", sample: true }
    ]
  },
  {
    id: "control-building",
    label: "CONTROL BUILDING",
    name: "อาคารควบคุมกลาง",
    lat: 13.883919783012458,
    lng: 100.55556309758739,
    category: "support",
    description: "อาคารสนับสนุนสำหรับติดตามและควบคุมการทำงานของระบบผลิตน้ำ",
    downloads: [
      { label: "ข้อมูลอาคารควบคุม (PDF)", url: "documents/control-building.pdf", sample: true }
    ]
  }
];
