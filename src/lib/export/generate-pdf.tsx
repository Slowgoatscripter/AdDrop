import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { CampaignKit } from '@/lib/types';
import { CampaignPdf } from './pdf-document';

export async function generatePdfBuffer(campaign: CampaignKit): Promise<Buffer> {
  const element = React.createElement(CampaignPdf, { campaign });
  // eslint-disable-next-line
  const buffer = await renderToBuffer(element as any);
  return Buffer.from(buffer);
}
