'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

interface QRCodeDisplayProps {
  username: string;
  technicianName: string;
}

export default function QRCodeDisplay({ username, technicianName }: QRCodeDisplayProps) {
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');
  
  // Generate the profile URL
  const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://thankatech.com'}/${username}`;
  
  // QR code sizes
  const qrSizes = {
    small: 200,
    medium: 300,
    large: 400
  };

  const handleDownload = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    // Create a canvas from the SVG
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    canvas.width = qrSizes[size];
    canvas.height = qrSizes[size];
    
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      // Download
      const downloadLink = document.createElement('a');
      downloadLink.download = `${username}-qr-code.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${technicianName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .container {
              text-align: center;
              border: 2px solid #000;
              padding: 40px;
              border-radius: 10px;
            }
            h1 {
              margin: 0 0 10px 0;
              font-size: 32px;
            }
            .subtitle {
              margin: 0 0 30px 0;
              font-size: 18px;
              color: #666;
            }
            .qr-container {
              margin: 20px 0;
            }
            .url {
              margin-top: 30px;
              font-size: 16px;
              color: #333;
              word-break: break-all;
            }
            .instructions {
              margin-top: 20px;
              font-size: 14px;
              color: #666;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${technicianName}</h1>
            <p class="subtitle">Scan to view my ThankATech profile</p>
            <div class="qr-container">
              ${document.getElementById('qr-code-svg')?.outerHTML || ''}
            </div>
            <p class="url">${profileUrl}</p>
            <p class="instructions">
              Scan this QR code with your phone camera to:<br>
              • View my profile<br>
              • Send a Thank You<br>
              • Send TOA tokens
            </p>
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
          <div className="mb-4">
            <QRCodeSVG
              id="qr-code-svg"
              value={profileUrl}
              size={qrSizes[size]}
              level="H"
              includeMargin={true}
              className="drop-shadow-lg"
            />
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
