import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  AlignmentType,
  WidthType,
} from 'docx';
import saveAs from 'file-saver';
import { DocumentGenerationContext, GeneratedDocumentResult } from '../types';
import {
  createDocumentHeader,
  createIdentityMetadataTable,
  createTableHeaderCell,
  createTableDataCell,
  createSignoffBlock,
  createSectionHeading,
  createProseParagraph,
  createDocxSectionProperties,
  DOCX_FONT,
  DOCX_COLOR_BLACK,
} from '../docxStyles';

export async function generateATP(context: DocumentGenerationContext): Promise<GeneratedDocumentResult> {
  const { school, profile, academicSetting, atp, cp } = context;

  const docChildren: (Paragraph | Table)[] = [];

  // Header
  docChildren.push(...createDocumentHeader('ALUR TUJUAN PEMBELAJARAN (ATP)', academicSetting.curriculum));

  // Metadata Table
  docChildren.push(createIdentityMetadataTable(school, profile, academicSetting));
  docChildren.push(new Paragraph({ spacing: { after: 180 } }));

  // Rasionalisasi Alur Pembelajaran
  if (atp.rationale) {
    docChildren.push(
      createSectionHeading('A. Rasionalisasi Alur Pembelajaran', 1),
      createProseParagraph(atp.rationale)
    );
  }

  // CP Ringkas
  if (cp?.generalDescription) {
    docChildren.push(
      createSectionHeading('B. Capaian Pembelajaran Rujukan', 1),
      createProseParagraph(cp.generalDescription, { italics: true })
    );
  }

  // ATP Matrix Section Title
  docChildren.push(
    createSectionHeading('C. Matriks Alur Tujuan Pembelajaran', 1)
  );

  // Table Headers
  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: [
      createTableHeaderCell('No', 6),
      createTableHeaderCell('Tujuan Pembelajaran (TP)', 28, AlignmentType.LEFT),
      createTableHeaderCell('Lingkup Materi', 20, AlignmentType.LEFT),
      createTableHeaderCell('Alokasi JP', 10),
      createTableHeaderCell('Dimensi Profil Lulusan', 18, AlignmentType.LEFT),
      createTableHeaderCell('Rencana Asesmen & Glosarium', 18, AlignmentType.LEFT),
    ],
  });

  // Table Data Rows
  const tableDataRows = (atp?.items || []).map((item, index) => {
    const p3List = item.p3Dimensions && item.p3Dimensions.length > 0 ? item.p3Dimensions.join(', ') : '-';
    const assessAndGloss = [
      item.assessmentPlan ? `Asesmen: ${item.assessmentPlan}` : '',
      item.glossary ? `Glosarium: ${item.glossary}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const itJp = item.allocatedJP ?? item.jp;
    const itJpDisplay = itJp != null ? `${itJp} JP` : '—';

    return new TableRow({
      children: [
        createTableDataCell(`${item.stepNumber || index + 1}`, 6, AlignmentType.CENTER),
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          margins: { top: 100, bottom: 100, left: 120, right: 120 },
          children: [
            new Paragraph({
              spacing: { line: 240, after: 0 },
              children: [
                new TextRun({ text: `[${item.tpCode || 'TP'}] `, bold: true, size: 20, font: DOCX_FONT, color: DOCX_COLOR_BLACK }),
                new TextRun({ text: item.tpStatement || '', size: 20, font: DOCX_FONT, color: DOCX_COLOR_BLACK }),
              ],
            }),
          ],
        }),
        createTableDataCell(item.materialScope || '-', 20),
        createTableDataCell(itJpDisplay, 10, AlignmentType.CENTER, true),
        createTableDataCell(p3List, 18),
        createTableDataCell(assessAndGloss || '-', 18),
      ],
    });
  });

  // Total JP Row
  const totalJP = (atp?.items || []).reduce((acc, curr) => acc + (Number(curr.allocatedJP ?? curr.jp) || 0), 0);
  const totalRow = new TableRow({
    children: [
      new TableCell({
        width: { size: 54, type: WidthType.PERCENTAGE },
        columnSpan: 3,
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { line: 240, after: 0 },
            children: [
              new TextRun({
                text: 'TOTAL ALOKASI WAKTU: ',
                bold: true,
                size: 20,
                font: DOCX_FONT,
                color: DOCX_COLOR_BLACK,
              }),
            ],
          }),
        ],
      }),
      createTableDataCell(totalJP > 0 ? `${totalJP} JP` : '—', 10, AlignmentType.CENTER, true),
      new TableCell({
        width: { size: 36, type: WidthType.PERCENTAGE },
        columnSpan: 2,
        children: [new Paragraph({})],
      }),
    ],
  });

  const atpTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [tableHeaderRow, ...tableDataRows, totalRow],
  });

  docChildren.push(atpTable);

  // Sign-off
  docChildren.push(...createSignoffBlock(school, profile, context.documentMode === 'blank', context.documentDate));

  // Build Document (Landscape A4)
  const doc = new Document({
    sections: [
      {
        properties: createDocxSectionProperties('landscape'),
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const cleanSubject = (academicSetting.subject || 'Mapel').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanGrade = (academicSetting.grade || 'Kelas').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `ATP_${cleanSubject}_${cleanGrade}_${new Date().toISOString().slice(0, 10)}.docx`;

  if (!context.skipDownload) {
    saveAs(blob, fileName);
  }

  return {
    success: true,
    type: 'ATP',
    title: 'Alur Tujuan Pembelajaran (ATP)',
    fileName,
    blob,
    record: {
      id: `doc-atp-${Date.now()}`,
      type: 'ATP',
      title: 'Alur Tujuan Pembelajaran (ATP)',
      status: 'completed',
      lastGenerated: new Date().toISOString(),
      fileName,
      academicSettingId: academicSetting.id,
      workspaceId: context.workspace?.id,
    },
  };
}
