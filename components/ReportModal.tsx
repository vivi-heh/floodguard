import React from 'react';
import { FloodDataPoint, PredictionOutput, AIReasoning } from '../types';
import { printExecutiveReport, downloadTextReport, downloadJsonReport, downloadQgisPackage } from '../services/reportGenerator';
import { X, Download, Printer, FileText, CheckCircle2, ShieldAlert, Layers } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: FloodDataPoint;
  prediction: PredictionOutput;
  reasoning: AIReasoning | null;
}

const ReportModal: React.FC<Props> = ({ isOpen, onClose, data, prediction, reasoning }) => {
  if (!isOpen) return null;

  const reportData = { point: data, prediction, reasoning };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Download Geospatial Flood Risk Report</h3>
              <p className="text-xs text-slate-500">Assessment and telemetry report for {data.locationName}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Overview */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Area Assessment Score</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900">{prediction.riskScore.toFixed(1)}/100</span>
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {prediction.riskLevel} Risk
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-end gap-1">
                Telemetry Verified
              </span>
              <span className="text-xs text-slate-500 block mt-0.5">Multi-Parametric Model</span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Choose Download Format:</span>

            {/* Option 1: PDF Print */}
            <button
              onClick={() => {
                printExecutiveReport(reportData);
              }}
              className="w-full p-4 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 transition-all flex items-center justify-between group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-lg group-hover:scale-105 transition-transform">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-blue-950">Executive PDF Report</h4>
                  <p className="text-xs text-blue-800/80">Formatted printable document with typography, charts & audit summary</p>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-700 px-3 py-1 bg-white rounded-lg shadow-xs border border-blue-200">
                Save as PDF
              </span>
            </button>

            {/* Option 2: Text / Markdown Report */}
            <button
              onClick={() => {
                downloadTextReport(reportData);
                onClose();
              }}
              className="w-full p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center justify-between group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-800 text-white rounded-lg group-hover:scale-105 transition-transform">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Standard Text Report (.txt)</h4>
                  <p className="text-xs text-slate-500">Universal plain text report with structured tables and telemetry</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-700 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200">
                Download .txt
              </span>
            </button>

            {/* Option 3: JSON Data Report */}
            <button
              onClick={() => {
                downloadJsonReport(reportData);
                onClose();
              }}
              className="w-full p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center justify-between group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-700 text-white rounded-lg group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Structured Telemetry Data (.json)</h4>
                  <p className="text-xs text-slate-500">Machine-readable hydrological payload and feature breakdown</p>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-700 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200">
                Download .json
              </span>
            </button>

            {/* Option 4: QGIS Layer Package (.geojson) */}
            <button
              onClick={() => {
                downloadQgisPackage([data], data);
                onClose();
              }}
              className="w-full p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 transition-all flex items-center justify-between group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-lg group-hover:scale-105 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">QGIS Spatial Vector Package (.geojson)</h4>
                  <p className="text-xs text-emerald-800/80">3D Vector layer ready for direct drag-and-drop into QGIS or ArcGIS (No API required)</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 px-3 py-1 bg-white rounded-lg border border-emerald-200 shadow-xs">
                Download .geojson
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
