import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const rows = await prisma.$queryRaw`
  SELECT bn.ma_so, bn.trang_thai_cod, pc.ma_phieu, pc.trang_thai
  FROM bien_nhan bn
  JOIN phieu_chuyen_cod_chi_tiet pct ON pct.bien_nhan_id = bn.id
  JOIN phieu_chuyen_cod pc ON pc.id = pct.phieu_id
  WHERE bn.trang_thai_cod = 'da_thu'
    AND pc.trang_thai IN ('cho_chuyen', 'da_chuyen')
`;

console.log('Rows with inconsistent data:', rows.length);
if (rows.length > 0) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  console.log('SAFE — No inconsistent BN found. Migration can proceed.');
}
await prisma.$disconnect();
