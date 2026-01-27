#!/usr/bin/env bun
import fs from 'fs';
import path from 'path';

const BRAND = process.env.BRAND || 'business';

// 写入品牌信息到构建输出目录
const brandInfoPath = path.join(process.cwd(), 'dist-electron', '.brand');
fs.mkdirSync(path.dirname(brandInfoPath), { recursive: true });
fs.writeFileSync(brandInfoPath, BRAND, 'utf-8');

console.log(`✓ Written brand info: ${BRAND} to ${brandInfoPath}`);
