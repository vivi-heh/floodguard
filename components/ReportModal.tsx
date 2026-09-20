import React, { useState, useMemo } from 'react';
import { FloodDataPoint, PredictionOutput, AIReasoning } from '../types';
import { 
  downloadHtmlReport, 
  downloadTextReport, 
  downloadJsonReport,
  generateMarkdownReport,
  generateJsonReportString,
  generateHtmlReport,
  openReportInNewWindow
} from '../services/reportGenerator';
import { 
  X, 
  Download, 
  Printer, 
  FileText, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  Code,
  Eye,
  Check,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: FloodDataPoint;
  prediction: PredictionOutput;
  reasoning: AIReasoning | null;
}

const ReportModal: React.FC<Props> = ({ isOpen, onClose, data, prediction, reasoning }) => {
  const [activeTab, setActiveTab] = useState<'download' | 'preview'>('download');
  const [downloadFeedback, setDownloadFeedback] = useState<{ message: string; filename?: string; url?: string } | null>(null);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const reportData = useMemo(() => ({ point: data, prediction, reasoning }), [data, prediction, reasoning]);
  const safeRiskScore = (prediction?.riskScore ?? 0).toFixed(1);
  const safeRiskLevel = prediction?.riskLevel || 'LOW';

  const markdownText = useMemo(() => {
    if (!isOpen) return '';
    return generateMarkdownReport(reportData);
  }, [isOpen, reportData]);

  if (!isOpen) return null;

  const copyToClipboard = async (text: string, formatKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFormat(formatKey);
      setTimeout(() => setCopiedFormat(null), 3000);
    } catch {
      // Fallback via textarea
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedFormat(formatKey);
      setTimeout(() => setCopiedFormat(null), 3000);
    }
  };

  const handleDownloadHtml = () => {
    try {
      const res = downloadHtmlReport(reportData);
      setDownloadFeedback({
        message: 'Executive HTML Report download started!',
        filename: res.filename,
        url: res.url
      });
    } catch (err) {
      console.error(err);
      copyToClipboard(generateHtmlReport(reportData), 'html');
      setDownloadFeedback({
        message: 'Report content copied to clipboard (browser download intercepted).'
      });
    }
  };

  const handleDownloadText = () => {
    try {
      const res = downloadTextReport(reportData);
      setDownloadFeedback({
        message: 'Standard Text Report (.txt) download started!',
        filename: res.filename,
        url: res.url
      });
    } catch (err) {
      console.error(err);
      copyToClipboard(markdownText, 'txt');
      setDownloadFeedback({
        message: 'Report text copied to clipboard.'
      });
    }
  };

  const handleDownloadJson = () => {
    try {
      const res = downloadJsonReport(reportData);
      setDownloadFeedback({
        message: 'Structured JSON Telemetry download started!',
        filename: res.filename,
        url: res.url
      });
    } catch (err) {
      console.error(err);
      const jsonStr = generateJsonReportString(reportData);
      copyToClipboard(jsonStr, 'json');
      setDownloadFeedback({
        message: 'JSON telemetry data copied to clipboard.'
      });
    }
  };

  const handleOpenInNewWindow = () => {
    const success = openReportInNewWindow(reportData);
    if (success) {
      setDownloadFeedback({
        message: 'Report opened in new tab. Press Ctrl+P (or Cmd+P) to print or save as PDF!'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 rounded-lg text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Geospatial Flood Risk Assessment Report</h3>
              <p className="text-xs text-slate-500 truncate max-w-[220px] sm:max-w-md">{data.locationName}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 px-4 sm:px-6 bg-white gap-4">
          <button
            onClick={() => setActiveTab('download')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'download' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Download & Print</span>
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-3 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'preview' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Live Report Preview</span>
          </button>
        </div>

        {/* Body Overview */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Risk Quick Summary Bar */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Composite Area Score</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black text-slate-900">{safeRiskScore}/100</span>
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                    {safeRiskLevel} Risk
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-end gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Telemetry Verified
              </span>
              <span className="text-xs text-slate-500 block mt-0.5">5-Axis Geospatial Model</span>
            </div>
          </div>

          {/* Feedback & Fallback Link Banner */}
          {downloadFeedback && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl space-y-1.5 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{downloadFeedback.message}</span>
              </div>
              {downloadFeedback.url && downloadFeedback.filename && (
                <div className="text-xs text-blue-700 pl-6 flex items-center gap-1.5 flex-wrap">
                  <span>If your browser blocked the automatic download:</span>
                  <a 
                    href={downloadFeedback.url} 
                    download={downloadFeedback.filename}
                    className="font-bold underline hover:text-blue-950 inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-blue-200"
                  >
                    <Download className="w-3 h-3" />
                    Click here to save {downloadFeedback.filename}
                  </a>
                </div>
              )}
            </div>
          )}

          {activeTab === 'download' ? (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 block">Available Download Formats:</span>

              {/* Option 1: Executive HTML Audit Report */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-all space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">Executive Assessment Audit (HTML / PDF)</h4>
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">Recommended</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        High-resolution formatted document with 5-axis decomposition tables, formulas, live telemetry, and civil defense directives.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={handleDownloadHtml}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .html</span>
                  </button>

                  <button
                    onClick={handleOpenInNewWindow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    title="Opens full report in clean tab for browser printing to PDF"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                    <span>Open in New Tab (Print to PDF)</span>
                  </button>

                  <button
                    onClick={() => copyToClipboard(generateHtmlReport(reportData), 'html')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer ml-auto"
                  >
                    {copiedFormat === 'html' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedFormat === 'html' ? 'Copied HTML!' : 'Copy HTML'}</span>
                  </button>
                </div>
              </div>

              {/* Option 2: Universal Plain Text / Markdown Report */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-slate-800 text-white rounded-lg shrink-0 mt-0.5">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Standard Text Audit (.txt)</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Clean monospace formatted report containing the entire 5-axis decomposition, mathematical weights, sensor readings, and recommendations.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={handleDownloadText}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .txt</span>
                  </button>

                  <button
                    onClick={() => copyToClipboard(markdownText, 'txt')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    {copiedFormat === 'txt' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedFormat === 'txt' ? 'Copied Text!' : 'Copy Text to Clipboard'}</span>
                  </button>
                </div>
              </div>

              {/* Option 3: Machine-Readable Telemetry JSON */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-lg shrink-0 mt-0.5">
                      <Code className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Structured Telemetry Data (.json)</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Raw JSON dataset for GIS integrations, hydrological modeling pipelines, and third-party automated response systems.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={handleDownloadJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .json</span>
                  </button>

                  <button
                    onClick={() => copyToClipboard(generateJsonReportString(reportData), 'json')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    {copiedFormat === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{copiedFormat === 'json' ? 'Copied JSON!' : 'Copy JSON'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Live Report Preview */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Live Report Text Content:</span>
                <button
                  onClick={() => copyToClipboard(markdownText, 'preview')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors cursor-pointer"
                >
                  {copiedFormat === 'preview' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-blue-600" />}
                  <span>{copiedFormat === 'preview' ? 'Copied Entire Report!' : 'Copy Entire Report'}</span>
                </button>
              </div>

              <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[380px] overflow-y-auto leading-relaxed border border-slate-800 select-all shadow-inner">
                <pre className="whitespace-pre-wrap">{markdownText}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Official Hydrological Audit • Ready for offline archiving</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
