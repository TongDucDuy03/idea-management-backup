export const RETIRED_DEPARTMENTS = [
  'Phòng Nghiên cứu thí nghiệm',
  'Phòng Kỹ thuật công nghệ',
];

export const departments = [
  'Phòng Hành chính nhân sự',
  'Phòng Nghiên cứu & Công nghệ',
  'Phòng Kinh doanh quốc tế',
  'Phòng Kinh tế kế toán',
  'Phòng Kiểm soát chất lượng',
  'Phòng Kế hoạch',
  'Phòng Vật tư',
  'Phòng Thiết bị',
  'Phòng Cải tiến',
  'PX Mẫu Xốp',
  'PX Khuôn',
  'PX Đúc 1',
  'PX Hoàn thiện',
  'PX Nhiệt luyện',
  'PX Cơ điện',
  'PX GCCK',
  'Nhà máy DISA',
  'Tổ liệu',
  'Thư ký ISO',
  'Thư ký An toàn 5S',
];

export const isRetiredDepartment = (dept: string): boolean =>
  RETIRED_DEPARTMENTS.includes(dept);

/** Active departments plus any retired names still stored on existing records. */
export const getDepartmentOptions = (currentValues?: string | string[]): string[] => {
  const values = !currentValues
    ? []
    : Array.isArray(currentValues)
      ? currentValues
      : [currentValues];

  const legacyInUse = values.filter((v) => isRetiredDepartment(v));
  const extras = legacyInUse.filter((v) => !departments.includes(v));
  return [...departments, ...extras];
};
