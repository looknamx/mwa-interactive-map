/*
 * ข้อมูล Label ทั้งหมดของแผนที่
 * x วัดจากซ้ายไปขวา และ y วัดจากบนลงล่าง หน่วยเป็นเปอร์เซ็นต์ของภาพ
 */
window.MAP_CONFIG = {
  imageUrl: "images/plant-map.jpg",
  imageWidth: 991,
  imageHeight: 637,
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
    x: 39.2,
    y: 37.5,
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
    x: 59.8,
    y: 48.2,
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
    x: 77.8,
    y: 72.2,
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
    x: 18.5,
    y: 59.5,
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
    x: 53.5,
    y: 22.5,
    category: "support",
    description: "อาคารสนับสนุนสำหรับติดตามและควบคุมการทำงานของระบบผลิตน้ำ",
    downloads: [
      { label: "ข้อมูลอาคารควบคุม (PDF)", url: "documents/control-building.pdf", sample: true }
    ]
  }
];
