/**
 * Clinical report export utilities
 * Supports PDF generation and FHIR bundle creation
 */

import type { StructuredClinicalReport } from '../types/clinical';

/**
 * Generate FHIR Bundle from clinical report
 * Returns FHIR R4 Bundle resource with Condition, MedicationRequest, and ServiceRequest
 */
export function generateFHIRBundle(report: StructuredClinicalReport): object {
  const bundle: any = {
    resourceType: 'Bundle',
    type: 'document',
    meta: {
      lastUpdated: report.updatedAt,
      profile: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-documentreference'
    },
    identifier: {
      system: 'urn:uuid',
      value: report.id
    },
    entry: []
  };

  // Add Condition resources (diagnoses)
  report.differentialDiagnosis.forEach((dx, idx) => {
    bundle.entry.push({
      fullUrl: `urn:uuid:condition-${idx}`,
      resource: {
        resourceType: 'Condition',
        id: `condition-${idx}`,
        meta: {
          profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition']
        },
        code: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/icd-10',
            code: dx.icd10 || 'unknown',
            display: dx.condition
          }]
        },
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clerical-status',
            code: 'active',
            display: dx.probability === 'High' ? 'Confirmed' : 'Suspected'
          }]
        }
      }
    });
  });

  // Add MedicationRequest resources (drug recommendations)
  report.drugRecommendations.forEach((drug, idx) => {
    bundle.entry.push({
      fullUrl: `urn:uuid:medication-${idx}`,
      resource: {
        resourceType: 'MedicationRequest',
        id: `medication-${idx}`,
        status: 'draft',
        intent: 'order',
        medication: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            display: drug.drugName
          }]
        },
        dosageInstruction: [{
          text: drug.dose ? `${drug.dose} ${drug.frequency || ''}` : drug.indication
        }]
      }
    });
  });

  // Add ServiceRequest resources (workup recommendations)
  report.workupRecommendations.forEach((workup, idx) => {
    bundle.entry.push({
      fullUrl: `urn:uuid:service-${idx}`,
      resource: {
        resourceType: 'ServiceRequest',
        id: `service-${idx}`,
        status: 'draft',
        intent: 'order',
        category: [{
          coding: [{
            system: 'http://snomed.info/sct',
            code: workup.category === 'lab' ? '108252007' : 
                  workup.category === 'imaging' ? '363689007' : '403169007'
          }]
        }],
        code: {
          display: workup.test
        },
        priority: workup.priority === 'urgent' ? 'STAT' : workup.priority === 'routine' ? 'routine' : 'optional'
      }
    });
  });

  return bundle;
}

/**
 * Generate PDF content from clinical report
 * Returns formatted text/HTML for PDF generation
 */
export function generatePDFContent(report: StructuredClinicalReport): string {
  const lines = [
    'CLINICAL ANALYSIS REPORT',
    '========================',
    '',
    `Report ID: ${report.id}`,
    `Generated: ${new Date(report.createdAt).toLocaleString()}`,
    `Complexity: ${report.complexityLevel || 'Standard'}`,
    '',
    'CHIEF COMPLAINT',
    '----------------',
    report.chiefComplaint || 'Not specified',
    '',
    'DIFFERENTIAL DIAGNOSIS',
    '--------------------',
  ];

  report.differentialDiagnosis.forEach((dx, idx) => {
    lines.push(`${idx + 1}. ${dx.condition} (${dx.probability} probability)`);
    if (dx.icd10) lines.push(`   ICD-10: ${dx.icd10}`);
    lines.push(`   Reasoning: ${dx.reasoning}`);
    lines.push(`   Workup: ${dx.recommendedWorkup.join(', ')}`);
    lines.push('');
  });

  lines.push('DRUG RECOMMENDATIONS');
  lines.push('--------------------');
  report.drugRecommendations.forEach((drug, idx) => {
    lines.push(`${idx + 1}. ${drug.drugName}`);
    lines.push(`   Indication: ${drug.indication}`);
    lines.push(`   Evidence Grade: ${drug.evidenceGrade}`);
    if (drug.dose) lines.push(`   Dose: ${drug.dose} ${drug.frequency || ''}`);
    if (drug.blackBoxWarning) lines.push(`   ⚠ BLACK BOX WARNING: ${drug.blackBoxWarning}`);
    lines.push('');
  });

  lines.push('ASSESSMENT & PLAN');
  lines.push('-----------------');
  lines.push(report.assessment || 'No assessment');
  lines.push('');
  lines.push('Plan:');
  report.plan.forEach((item, idx) => lines.push(`  ${idx + 1}. ${item}`));
  lines.push('');

  lines.push('CLINICAL ALERTS');
  lines.push('---------------');
  report.alerts.forEach((alert, idx) => {
    lines.push(`${idx + 1}. [${alert.severity.toUpperCase()}] ${alert.title}`);
    lines.push(`   ${alert.description}`);
    lines.push(`   Recommendation: ${alert.recommendation}`);
    lines.push('');
  });

  lines.push('========================');
  lines.push('End of Report');

  return lines.join('\n');
}

/**
 * Trigger browser print for report
 */
export function printReport(report: StructuredClinicalReport): void {
  const content = generatePDFContent(report);
  const printWindow = window.open('', '', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write('<pre style="font-family: monospace; font-size: 12px;">');
    printWindow.document.write(content.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    printWindow.document.write('</pre>');
    printWindow.document.close();
    printWindow.print();
  }
}

/**
 * Download FHIR bundle as JSON
 */
export function downloadFHIRBundle(report: StructuredClinicalReport): void {
  const bundle = generateFHIRBundle(report);
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fhir-bundle-${report.id}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
