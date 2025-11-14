'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

interface QRCodeDisplayProps {
  username: string;
  technicianName: string;
}

export default function QRCodeDisplay({ username, technicianName }: QRCodeDisplayProps) {
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  
  // Use production URL - always thankatech.com
  const profileUrl = `https://thankatech.com/${username}`;
  
  // QR code sizes
  const qrSizes = {
    small: 200,
    medium: 300,
    large: 400
  };

  const handleDownload = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const qrSize = qrSizes[size];
    const logoSize = qrSize * 0.2;
    
    // Create a canvas with extra space for branding
    const canvas = document.createElement('canvas');
    const padding = 40;
    const brandingHeight = 100;
    canvas.width = qrSize + (padding * 2);
    canvas.height = qrSize + (padding * 2) + brandingHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add wrench icon
    ctx.font = '32px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔧', canvas.width / 2, 30);
    
    // Add ThankATech branding at top with gradient effect
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#2563eb');
    gradient.addColorStop(1, '#1e40af');
    ctx.fillStyle = gradient;
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ThankATech', canvas.width / 2, 60);
    
    ctx.fillStyle = '#64748b';
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.fillText(technicianName, canvas.width / 2, 85);
    
    // Draw QR code
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = () => {
      ctx.drawImage(img, padding, brandingHeight + padding);
      
      // Draw wrench logo overlay in center of QR code
      const centerX = canvas.width / 2;
      const centerY = brandingHeight + padding + (qrSize / 2);
      
      // White background for logo
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      const logoX = centerX - (logoSize / 2);
      const logoY = centerY - (logoSize / 2);
      
      // Rounded rectangle background
      ctx.beginPath();
      const radius = 8;
      ctx.moveTo(logoX + radius, logoY);
      ctx.lineTo(logoX + logoSize - radius, logoY);
      ctx.arcTo(logoX + logoSize, logoY, logoX + logoSize, logoY + radius, radius);
      ctx.lineTo(logoX + logoSize, logoY + logoSize - radius);
      ctx.arcTo(logoX + logoSize, logoY + logoSize, logoX + logoSize - radius, logoY + logoSize, radius);
      ctx.lineTo(logoX + radius, logoY + logoSize);
      ctx.arcTo(logoX, logoY + logoSize, logoX, logoY + logoSize - radius, radius);
      ctx.lineTo(logoX, logoY + radius);
      ctx.arcTo(logoX, logoY, logoX + radius, logoY, radius);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Gradient background for logo
      const logoGradient = ctx.createLinearGradient(logoX, logoY, logoX + logoSize, logoY);
      logoGradient.addColorStop(0, '#2563eb');
      logoGradient.addColorStop(1, '#1e40af');
      ctx.fillStyle = logoGradient;
      ctx.fill();
      
      // Draw wrench emoji in center
      ctx.font = `${logoSize * 0.5}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔧', centerX, centerY);
      
      // Download
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${username}-thankatech-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const qrSize = qrSizes[size];
    const logoSize = qrSize * 0.2;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${technicianName}</title>
          <style>
            @media print {
              @page {
                margin: 0;
                size: auto;
              }
              body {
                margin: 1cm;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
            }
            
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              font-family: system-ui, -apple-system, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .container {
              text-align: center;
              border: 3px solid #1e293b;
              padding: 40px;
              border-radius: 20px;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header {
              margin-bottom: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 10px;
            }
            .brand-logo {
              width: 60px;
              height: 60px;
              background: linear-gradient(to right, #2563eb, #1e40af);
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .brand {
              font-size: 36px;
              font-weight: bold;
              color: #2563eb;
              margin: 0;
            }
            h1 {
              margin: 10px 0 0 0;
              font-size: 28px;
              color: #1e293b;
            }
            .subtitle {
              margin: 10px 0 30px 0;
              font-size: 16px;
              color: #64748b;
            }
            .qr-container {
              margin: 20px 0;
              position: relative;
              display: inline-block;
              background: white;
              padding: 20px;
              border-radius: 16px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .qr-logo-overlay {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: ${logoSize}px;
              height: ${logoSize}px;
              background: white;
              border-radius: 12px;
              padding: 8px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              border: 4px solid white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .logo-inner {
              width: 100%;
              height: 100%;
              background: linear-gradient(to right, #2563eb, #1e40af);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${logoSize * 0.5}px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .url {
              margin-top: 30px;
              font-size: 16px;
              color: #475569;
              word-break: break-all;
              background: white;
              padding: 15px;
              border-radius: 10px;
              border: 2px solid #e2e8f0;
            }
            .instructions {
              margin-top: 20px;
              font-size: 14px;
              color: #64748b;
              background: white;
              padding: 20px;
              border-radius: 10px;
              border: 2px solid #e2e8f0;
            }
            .instructions strong {
              color: #1e293b;
              display: block;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="brand-logo">🔧</div>
              <div class="brand">ThankATech</div>
              <h1>${technicianName}</h1>
            </div>
            <p class="subtitle">Scan to view my profile & send appreciation</p>
            <div class="qr-container">
              ${document.getElementById('qr-code-svg')?.outerHTML || ''}
              <div class="qr-logo-overlay">
                <div class="logo-inner">
                  🔧
                </div>
              </div>
            </div>
            <p class="url">${profileUrl}</p>
            <div class="instructions">
              <strong>📱 How to Scan:</strong>
              • Open your phone camera<br>
              • Point at the QR code<br>
              • Tap the notification to visit profile<br>
              • Send a Thank You or TOA tokens
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(profileUrl);
    alert('Profile URL copied to clipboard!');
  };

  return (
    <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 backdrop-blur-lg rounded-xl border border-purple-400/30 p-6">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        📱 Your Profile QR Code
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR Code Display */}
        <div className="bg-white rounded-xl p-6 flex flex-col items-center">
          <div className="mb-4 relative">
            {/* Rounded corners wrapper */}
            <div className="overflow-hidden rounded-2xl shadow-2xl">
              <QRCodeSVG
                id="qr-code-svg"
                value={profileUrl}
                size={qrSizes[size]}
                level="H"
                includeMargin={true}
                className="drop-shadow-lg"
                fgColor="#1e293b"
                bgColor="#ffffff"
              />
            </div>
            {/* ThankATech Logo Overlay */}
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-2 shadow-xl border-4 border-white"
              style={{ width: qrSizes[size] * 0.2, height: qrSizes[size] * 0.2 }}
            >
              <div className="w-full h-full bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <span className="text-white" style={{ fontSize: qrSizes[size] * 0.1 }}>
                  🔧
                </span>
              </div>
            </div>
          </div>
          
          {/* ThankATech Branding */}
          <div className="text-center mb-4">
            <p className="text-transparent bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text font-bold text-lg">
              ThankATech
            </p>
            <p className="text-gray-600 text-sm">{technicianName}</p>
          </div>
          
          {/* Size Selector */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSize('small')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                size === 'small'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Small
            </button>
            <button
              onClick={() => setSize('medium')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                size === 'medium'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Medium
            </button>
            <button
              onClick={() => setSize('large')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                size === 'large'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Large
            </button>
          </div>

          <p className="text-gray-600 text-sm text-center">
            Scan this code to visit your profile
          </p>
        </div>

        {/* Actions & Info */}
        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <h4 className="text-white font-semibold mb-2">Your Profile URL</h4>
            <div className="bg-white/5 rounded px-3 py-2 mb-3">
              <p className="text-blue-300 text-sm break-all">{profileUrl}</p>
            </div>
            <button
              onClick={copyUrl}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              📋 Copy URL
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <h4 className="text-white font-semibold mb-3">Download & Share</h4>
            <div className="space-y-2">
              <button
                onClick={handleDownload}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                ⬇️ Download PNG
              </button>
              <button
                onClick={handlePrint}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                🖨️ Print QR Code
              </button>
            </div>
          </div>

          <div className="bg-blue-500/10 backdrop-blur-sm rounded-lg p-4 border border-blue-400/30">
            <h4 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
              💡 How to Use
            </h4>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• Print and display at your workspace</li>
              <li>• Add to business cards or flyers</li>
              <li>• Share on social media</li>
              <li>• Include in email signatures</li>
              <li>• Display at events or trade shows</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
