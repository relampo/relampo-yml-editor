import { useState } from 'react';
import { Download, Printer, Share2, Copy, Check } from 'lucide-react';
import { Button } from './ui/button';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';

type MaterialType = 
  | 'rollup' 
  | 'tshirt' 
  | 'hoodie'
  | 'stickers' 
  | 'coasters' 
  | 'bottle' 
  | 'totebag' 
  | 'table-cover'
  | 'cards';

interface Material {
  id: MaterialType;
  title: string;
  subtitle: string;
  specs: string;
}

export function BrandCampaign() {
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialType>('rollup');
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  const materials: Material[] = [
    {
      id: 'rollup',
      title: 'Roll-up Banner',
      subtitle: 'Conference Stand',
      specs: '85cm × 200cm • 300 DPI • CMYK',
    },
    {
      id: 'tshirt',
      title: 'T-Shirts',
      subtitle: 'Engineer Swag',
      specs: 'Front + Back • Vector Ready',
    },
    {
      id: 'hoodie',
      title: 'Hoodies',
      subtitle: 'Premium Swag',
      specs: 'Front + Back • High Quality Print',
    },
    {
      id: 'stickers',
      title: 'Laptop Stickers',
      subtitle: 'Developer Humor',
      specs: '7cm × 7cm • Die-cut • UV Resistant',
    },
    {
      id: 'coasters',
      title: 'Coasters',
      subtitle: 'Office Premium',
      specs: '10cm × 10cm • Cork Back',
    },
    {
      id: 'bottle',
      title: 'Water Bottles',
      subtitle: 'High Value Swag',
      specs: '750ml • Stainless Steel',
    },
    {
      id: 'totebag',
      title: 'Tote Bags',
      subtitle: 'Utility Swag',
      specs: '38cm × 42cm • Cotton Canvas',
    },
    {
      id: 'table-cover',
      title: 'Table Cover',
      subtitle: 'Sponsor Booth',
      specs: '183cm × 76cm • Polyester',
    },
    {
      id: 'cards',
      title: 'Info Cards',
      subtitle: 'Handouts',
      specs: '10cm × 15cm • 350gsm',
    },
  ];

  const brandColors = [
    { name: 'Primary Yellow', hex: '#facc15', cmyk: 'C0 M18 Y92 K0' },
    { name: 'Lightning Yellow', hex: '#fbbf24', cmyk: 'C0 M24 Y86 K0' },
    { name: 'Deep Yellow', hex: '#f59e0b', cmyk: 'C0 M36 Y96 K0' },
    { name: 'Dark BG', hex: '#0a0a0a', cmyk: 'C0 M0 Y0 K96' },
    { name: 'Card BG', hex: '#111111', cmyk: 'C0 M0 Y0 K93' },
    { name: 'Text Zinc', hex: '#e4e4e7', cmyk: 'C8 M5 Y5 K0' },
  ];

  const copyToClipboard = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const createMaterialReadme = (materialName: string, specs: string) => {
    return `# Relampo ${materialName}

## Brand Guidelines

### Colors
- Primary Yellow: #facc15 (C0 M18 Y92 K0)
- Lightning Yellow: #fbbf24 (C0 M24 Y86 K0)
- Deep Yellow: #f59e0b (C0 M36 Y96 K0)
- Dark BG: #0a0a0a (C0 M0 Y0 K96)
- Card BG: #111111 (C0 M0 Y0 K93)
- Text Zinc: #e4e4e7 (C8 M5 Y5 K0)

### Specifications
${specs}

### Logo Usage
- Always maintain proper spacing around the lightning bolt logo
- Minimum size: 2cm for print materials
- Use gradient: from-yellow-300 via-yellow-400 to-yellow-500

### Typography
- Brand Name: RELAMPO (all caps, black/tracking-tight)
- Tagline: "Performance testing made simple"
- Font style: Modern, bold, high contrast

### Files Included
- README.md (this file)
- brand-colors.json (color specifications)
- design-specs.txt (detailed specifications)

## Notes
This is a preview package. For print-ready files, please contact the design team.
`;
  };

  const createBrandColorsJson = () => {
    return JSON.stringify({
      brand: "Relampo",
      colors: {
        primary: brandColors.map(color => ({
          name: color.name,
          hex: color.hex,
          cmyk: color.cmyk
        }))
      }
    }, null, 2);
  };

  const createStickersList = () => {
    return `# Relampo Sticker Pack

## Sticker Designs

1. **Logo Sticker** (Round)
   - Classic lightning bolt logo
   - Yellow gradient background
   - 7cm diameter

2. **Si la Velocidad Emociona, La Fricción Mata** (Square)
   - Red to yellow gradient
   - Bold statement about speed
   - 7cm × 7cm

3. **Alice in Wonderland Quote** (Square)
   - "How much is forever? Sometimes, just a second."
   - Time-themed
   - Black background with yellow border

4. **Fast or Slow** (Square)
   - Lightning bolt with "FAST or ~~slow~~"
   - Speed choice humor
   - Yellow background

5. **Time is Performance** (Square)
   - Clock emoji with "Every ms counts"
   - Developer wisdom
   - Dark background

6. **99ms vs 1001ms** (Square)
   - "User thinks you're fast" vs "User left"
   - Reality check humor
   - Yellow gradient

7. **No Loading** (Square)
   - Loading dots crossed out
   - "RELAMPO" - instant performance
   - White background

8. **REDLINE** (Square)
   - Racing-inspired design
   - "Performance at the limit"
   - Red border, yellow lightning

9. **Slow = Broken** (Square)
   - Snail emoji crossed out
   - Simple truth
   - Dark gradient

10. **Blink and You'll Miss It** (Square)
    - Eye emoji
    - Speed humor
    - Yellow background

11. **Patience is NOT a virtue** (Square)
    - Anti-patience message
    - Lightning bolt
    - Dark background

12. **Milliseconds Matter** (Square)
    - 001ms, 010ms, 100ms
    - "Every one counts"
    - Black with yellow border

## Printing Instructions
- Material: Vinyl with UV coating
- Finish: Glossy or matte
- Die-cut around shape
- Weather resistant for outdoor use
`;
  };

  const createHoodieSpecs = () => {
    return `# Relampo Hoodie Designs

## Dark Edition

### Front
- Small logo on chest (left side, 10cm × 10cm)
- Text: "RELAMPO" below logo
- Subtitle: "Performance testing made simple"
- Colors: Yellow gradient logo on black hoodie

### Back
- Large logo centered (25cm × 25cm)
- Text: "RELAMPO" in large letters
- Tagline: "Performance testing made simple"
- Features listed:
  * Declarative YAML
  * Traffic Recording
  * Auto-Correlation

## Light Edition (Heather Gray)

### Front
- Same layout as dark edition
- Yellow-orange gradient logo
- Black text

### Back
- Same layout as dark edition
- Darker yellow gradient for contrast
- Black text

## Specifications
- Material: 80% cotton, 20% polyester
- Weight: 280-300gsm
- Print method: Screen print or DTG
- Sizes: S, M, L, XL, XXL
- Hood: Drawstring, lined
- Pocket: Front kangaroo pocket
`;
  };

  const capturePreviewImages = async () => {
    const images: { name: string; blob: Blob }[] = [];
    
    try {
      // Find all preview elements in the current view
      const previewElements = document.querySelectorAll('[data-preview-capture]');
      
      for (let i = 0; i < previewElements.length; i++) {
        const element = previewElements[i] as HTMLElement;
        const previewName = element.getAttribute('data-preview-name') || `preview-${i + 1}`;
        
        // Capture the element as canvas
        const canvas = await html2canvas(element, {
          backgroundColor: null,
          scale: 2, // Higher quality
          logging: false,
        });
        
        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), 'image/png');
        });
        
        images.push({ name: `${previewName}.png`, blob });
      }
    } catch (error) {
      console.error('Error capturing preview images:', error);
    }
    
    return images;
  };

  const handleDownload = async (materialName: string, materialType?: MaterialType) => {
    setDownloadMessage(`Preparing ${materialName} for download...`);
    
    try {
      const zip = new JSZip();
      
      // Get the material specs
      const material = materials.find(m => m.title === materialName) || materials[0];
      
      // Add README
      zip.file('README.md', createMaterialReadme(materialName, material.specs));
      
      // Add brand colors JSON
      zip.file('brand-colors.json', createBrandColorsJson());
      
      // Add specific content based on material type
      if (materialType === 'stickers' || materialName === 'Sticker Pack') {
        zip.file('stickers-list.txt', createStickersList());
      }
      
      if (materialType === 'hoodie' || materialName === 'Hoodie Designs') {
        zip.file('hoodie-specifications.txt', createHoodieSpecs());
      }
      
      // Add design specs
      const designSpecs = `Relampo ${materialName}
      
Specifications: ${material.specs}

Design Notes:
- Use official brand colors (see brand-colors.json)
- Maintain consistent lightning bolt logo
- Follow typography guidelines in README.md
- Ensure high contrast for readability

Print Quality:
- Minimum 300 DPI for all raster images
- Vector formats preferred (SVG, AI, EPS)
- CMYK color mode for print
- RGB color mode for digital

Contact:
For print-ready files and additional formats, contact the Relampo design team.
`;
      
      zip.file('design-specs.txt', designSpecs);
      
      // Capture and add preview images
      setDownloadMessage(`Capturing preview images...`);
      const previewImages = await capturePreviewImages();
      
      if (previewImages.length > 0) {
        const imagesFolder = zip.folder('previews');
        previewImages.forEach(({ name, blob }) => {
          if (imagesFolder) {
            imagesFolder.file(name, blob);
          }
        });
      }
      
      // Generate the ZIP file
      setDownloadMessage(`Creating ZIP file...`);
      const blob = await zip.generateAsync({ type: 'blob' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relampo-${materialName.toLowerCase().replace(/\s+/g, '-')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setDownloadMessage(`✓ ${materialName} downloaded successfully!`);
      setTimeout(() => setDownloadMessage(null), 3000);
    } catch (error) {
      console.error('Download error:', error);
      setDownloadMessage('Error creating download. Please try again.');
      setTimeout(() => setDownloadMessage(null), 3000);
    }
  };

  const handleDownloadAll = async () => {
    setDownloadMessage('Preparing complete brand package...');
    
    try {
      const zip = new JSZip();
      
      // Add main README
      zip.file('README.md', `# Relampo Brand Campaign Package

Complete brand materials package for Relampo performance testing platform.

## Contents

- /rollup-banners/ - Conference stand designs
- /tshirts/ - T-shirt designs (dark and light)
- /hoodies/ - Hoodie designs with specifications
- /stickers/ - Laptop sticker pack (12 designs)
- /coasters/ - Coaster designs
- /bottles/ - Water bottle designs
- /tote-bags/ - Tote bag designs
- /table-covers/ - Booth table cover design
- /info-cards/ - Handout cards (front and back)
- brand-colors.json - Official color palette
- brand-guidelines.md - Complete brand guidelines

## Brand Overview

**Relampo** is a modern performance testing platform that makes load testing simple and reliable.

**Tagline:** Performance testing made simple

**Key Features:**
- Declarative YAML configuration
- Real traffic recording
- Auto-correlation

**Visual Identity:**
- Lightning bolt logo with yellow gradient
- Dark theme (professional)
- High contrast, modern design
- Focus on speed and reliability

For questions or print-ready files, contact the design team.
`);
      
      // Add brand colors
      zip.file('brand-colors.json', createBrandColorsJson());
      
      // Add materials to folders
      materials.forEach(material => {
        const folder = zip.folder(material.title.toLowerCase().replace(/\s+/g, '-'));
        if (folder) {
          folder.file('README.md', createMaterialReadme(material.title, material.specs));
          folder.file('specs.txt', `${material.title}\n${material.subtitle}\n\nSpecifications:\n${material.specs}`);
        }
      });
      
      // Add stickers
      const stickersFolder = zip.folder('stickers');
      if (stickersFolder) {
        stickersFolder.file('stickers-list.txt', createStickersList());
      }
      
      // Add hoodies
      const hoodiesFolder = zip.folder('hoodies');
      if (hoodiesFolder) {
        hoodiesFolder.file('hoodie-specifications.txt', createHoodieSpecs());
      }
      
      // Generate and download
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'relampo-brand-package-complete.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setDownloadMessage('✓ Complete brand package downloaded!');
      setTimeout(() => setDownloadMessage(null), 3000);
    } catch (error) {
      setDownloadMessage('Error creating package. Please try again.');
      setTimeout(() => setDownloadMessage(null), 3000);
    }
  };

  const handleShare = async () => {
    setDownloadMessage('Copying share link to clipboard...');
    
    try {
      await navigator.clipboard.writeText('https://relampo.dev/brand-campaign');
      setDownloadMessage('✓ Share link copied to clipboard!');
      setTimeout(() => setDownloadMessage(null), 3000);
    } catch (error) {
      setDownloadMessage('Share link: https://relampo.dev/brand-campaign');
      setTimeout(() => setDownloadMessage(null), 5000);
    }
  };

  const handlePrint = () => {
    setDownloadMessage('Opening print dialog...');
    setTimeout(() => {
      window.print();
      setDownloadMessage(null);
    }, 1000);
  };

  return (
    <div className="h-full w-full bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#111111] border-b border-white/5 px-8 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-yellow-300 via-yellow-400 to-yellow-500 rounded-full shadow-lg shadow-yellow-400/40" />
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
                Relampo Brand Campaign
              </h1>
              <p className="text-sm text-zinc-400 mt-0.5">
                Event Materials • Swag • Print-Ready Assets
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share Package
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-yellow-400/20 bg-yellow-400/5 hover:bg-yellow-400/10 text-yellow-400"
              onClick={handleDownloadAll}
            >
              <Download className="w-4 h-4 mr-2" />
              Download All
            </Button>
          </div>
        </div>
        {downloadMessage && (
          <div className="mt-2 text-sm text-yellow-400 flex items-center gap-2">
            <Check className="w-4 h-4" />
            {downloadMessage}
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar - Material Types */}
        <div className="w-64 border-r border-white/5 bg-[#0a0a0a] overflow-y-auto flex-shrink-0">
          <div className="p-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Materials
            </h3>
            <div className="space-y-1">
              {materials.map((material) => (
                <button
                  key={material.id}
                  onClick={() => setSelectedMaterial(material.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                    selectedMaterial === material.id
                      ? 'bg-yellow-400/10 text-yellow-400 shadow-sm'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`}
                >
                  <div className="font-medium text-sm">{material.title}</div>
                  <div className="text-xs opacity-70 mt-0.5">{material.subtitle}</div>
                </button>
              ))}
            </div>

            {/* Brand Colors */}
            <div className="mt-8">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Brand Colors
              </h3>
              <div className="space-y-2">
                {brandColors.map((color) => (
                  <div
                    key={color.hex}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
                    onClick={() => copyToClipboard(color.hex)}
                  >
                    <div
                      className="w-8 h-8 rounded border border-white/10 shadow-lg flex-shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-zinc-300">{color.name}</div>
                      <div className="text-xs text-zinc-500 font-mono">{color.hex}</div>
                    </div>
                    {copiedHex === color.hex ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Material Preview */}
        <div className="flex-1 overflow-y-auto bg-[#0a0a0a] min-w-0">
          <div className="p-8">
            {selectedMaterial === 'rollup' && <RollupBanner onDownload={handleDownload} />}
            {selectedMaterial === 'tshirt' && <TShirtDesigns onDownload={handleDownload} />}
            {selectedMaterial === 'hoodie' && <HoodieDesigns onDownload={handleDownload} />}
            {selectedMaterial === 'stickers' && <StickerDesigns onDownload={handleDownload} />}
            {selectedMaterial === 'coasters' && <CoasterDesigns onDownload={handleDownload} />}
            {selectedMaterial === 'bottle' && <BottleDesigns onDownload={handleDownload} />}
            {selectedMaterial === 'totebag' && <ToteBagDesigns onDownload={handleDownload} />}
            {selectedMaterial === 'table-cover' && <TableCoverDesign onPrint={handlePrint} />}
            {selectedMaterial === 'cards' && <InfoCards onDownload={handleDownload} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Roll-up Banner Component
function RollupBanner({ onDownload }: { onDownload: (materialName: string, materialType?: MaterialType) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Roll-up Banner</h2>
        <p className="text-zinc-400">Conference stand · 85cm × 200cm · 300 DPI</p>
      </div>

      {/* Banner Preview - Aspect ratio 85:200 */}
      <div className="max-w-2xl mx-auto">
        <div className="relative bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden shadow-2xl" style={{ aspectRatio: '85/200' }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
            {/* Logo */}
            <div className="relative w-32 h-32 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-yellow-400/50 mb-12">
              <svg width="64" height="80" viewBox="0 0 18 22" fill="none">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-2xl"/>
              </svg>
            </div>

            {/* Brand Name */}
            <h1 className="text-7xl font-black text-zinc-100 tracking-tighter mb-6">
              RELAMPO
            </h1>

            {/* Main Message */}
            <p className="text-3xl font-semibold text-yellow-400 mb-8 leading-tight">
              Performance testing<br />made simple.
            </p>

            {/* Features */}
            <div className="text-lg text-zinc-400 space-y-2 font-medium">
              <p>Declarative YAML</p>
              <p>Traffic Recording</p>
              <p>Auto-Correlation</p>
            </div>

            {/* Subtle decoration */}
            <div className="absolute bottom-8 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />
          </div>
        </div>

        {/* Download Button */}
        <div className="mt-6 flex justify-center">
          <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={() => onDownload('Roll-up Banner', 'rollup')}>
            <Download className="w-4 h-4 mr-2" />
            Download High-Res (300 DPI)
          </Button>
        </div>
      </div>

      {/* Alternative Designs */}
      <div className="mt-12">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Alternative Messages</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            'Trust your performance tests.',
            'One YAML. Real traffic. Real confidence.',
            'From real traffic to reliable load tests.',
          ].map((msg, i) => (
            <div key={i} className="bg-[#111111] border border-white/5 rounded-lg p-4 text-center hover:border-yellow-400/30 transition-colors cursor-pointer">
              <p className="text-sm text-zinc-300 font-medium">{msg}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// T-Shirt Designs Component
function TShirtDesigns({ onDownload }: { onDownload: (materialName: string, materialType?: MaterialType) => void }) {
  const designs = [
    { text: 'Trust the YAML.', position: 'Front - Center' },
    { text: 'Performance testing, minus the pain.', position: 'Back - Full' },
    { text: 'One YAML to rule them all.', position: 'Front - Center' },
    { text: 'Keep calm and trust your load test.', position: 'Front - Center' },
    { text: 'I test performance for real.', position: 'Front - Center' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">T-Shirt Designs</h2>
        <p className="text-zinc-400">Engineer-friendly · Minimal · High-quality</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Dark T-Shirt */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Dark Edition</h3>
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-12 aspect-square flex flex-col items-center justify-center text-center">
            <div className="relative w-16 h-16 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-xl shadow-yellow-400/40 mb-6">
              <svg width="28" height="36" viewBox="0 0 18 22" fill="none">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-lg"/>
              </svg>
            </div>
            <p className="text-2xl font-bold text-zinc-100">Trust the YAML.</p>
          </div>
        </div>

        {/* Light T-Shirt */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Light Edition</h3>
          <div className="bg-zinc-100 border border-zinc-300 rounded-xl p-12 aspect-square flex flex-col items-center justify-center text-center">
            <div className="relative w-16 h-16 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-xl shadow-yellow-500/40 mb-6">
              <svg width="28" height="36" viewBox="0 0 18 22" fill="none">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-lg"/>
              </svg>
            </div>
            <p className="text-2xl font-bold text-zinc-900">Trust the YAML.</p>
          </div>
        </div>
      </div>

      {/* Alternative Texts */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-zinc-100 mb-4">Design Variations</h3>
        <div className="space-y-2">
          {designs.map((design, i) => (
            <div key={i} className="bg-[#111111] border border-white/5 rounded-lg p-4 flex items-center justify-between hover:border-yellow-400/30 transition-colors">
              <span className="text-zinc-300 font-medium">{design.text}</span>
              <span className="text-xs text-zinc-500 font-mono">{design.position}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={() => onDownload('T-Shirts', 'tshirt')}>
          <Download className="w-4 h-4 mr-2" />
          Download T-Shirt Designs
        </Button>
      </div>
    </div>
  );
}

// Hoodie Designs Component
function HoodieDesigns({ onDownload }: { onDownload: (materialName: string, materialType?: MaterialType) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Hoodie Designs</h2>
        <p className="text-zinc-400">Premium swag · Modern · Street style</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Dark Hoodie - Front */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Dark Edition - Front</h3>
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-12 aspect-[3/4] flex flex-col items-center justify-center text-center">
            {/* Small Logo on chest */}
            <div className="relative w-16 h-16 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-xl flex items-center justify-center shadow-xl shadow-yellow-400/40 mb-4">
              <svg width="28" height="36" viewBox="0 0 18 22" fill="none">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-lg"/>
              </svg>
            </div>
            <p className="text-xl font-bold text-zinc-100 mb-1">RELAMPO</p>
            <p className="text-sm text-zinc-400">Performance testing<br />made simple</p>
          </div>
        </div>

        {/* Dark Hoodie - Back */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Dark Edition - Back</h3>
          <div className="bg-[#0a0a0a] border border-white/5 rounded-xl p-12 aspect-[3/4] flex flex-col items-center justify-center text-center">
            {/* Large logo and text on back */}
            <div className="relative w-24 h-24 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-yellow-400/50 mb-6">
              <svg width="42" height="52" viewBox="0 0 18 22" fill="none">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-2xl"/>
              </svg>
            </div>
            <p className="text-3xl font-black text-zinc-100 tracking-tight mb-3">RELAMPO</p>
            <p className="text-lg text-yellow-400 font-semibold mb-6">Performance testing<br />made simple</p>
            <div className="text-xs text-zinc-500 space-y-1">
              <p>Declarative YAML</p>
              <p>Traffic Recording</p>
              <p>Auto-Correlation</p>
            </div>
          </div>
        </div>

        {/* Light Hoodie - Front */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Light Edition - Front</h3>
          <div className="bg-zinc-100 border border-zinc-300 rounded-xl p-12 aspect-[3/4] flex flex-col items-center justify-center text-center">
            <div className="relative w-16 h-16 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-xl shadow-yellow-500/40 mb-4">
              <svg width="28" height="36" viewBox="0 0 18 22" fill="none">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-lg"/>
              </svg>
            </div>
            <p className="text-xl font-bold text-zinc-900 mb-1">RELAMPO</p>
            <p className="text-sm text-zinc-600">Performance testing<br />made simple</p>
          </div>
        </div>

        {/* Light Hoodie - Back */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Light Edition - Back</h3>
          <div className="bg-zinc-100 border border-zinc-300 rounded-xl p-12 aspect-[3/4] flex flex-col items-center justify-center text-center">
            <div className="relative w-24 h-24 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-yellow-500/50 mb-6">
              <svg width="42" height="52" viewBox="0 0 18 22" fill="none">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-2xl"/>
              </svg>
            </div>
            <p className="text-3xl font-black text-zinc-900 tracking-tight mb-3">RELAMPO</p>
            <p className="text-lg text-yellow-600 font-semibold mb-6">Performance testing<br />made simple</p>
            <div className="text-xs text-zinc-600 space-y-1">
              <p>Declarative YAML</p>
              <p>Traffic Recording</p>
              <p>Auto-Correlation</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={() => onDownload('Hoodie Designs', 'hoodie')}>
          <Download className="w-4 h-4 mr-2" />
          Download Hoodie Pack
        </Button>
      </div>
    </div>
  );
}

// Sticker Designs Component
function StickerDesigns({ onDownload }: { onDownload: (materialName: string, materialType?: MaterialType) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Laptop Stickers</h2>
        <p className="text-zinc-400">Die-cut · UV resistant · 7cm diameter · Developer humor</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Logo Sticker */}
        <div className="space-y-3">
          <div className="bg-[#111111] border border-white/5 rounded-xl p-8 aspect-square flex items-center justify-center">
            <div className="relative w-24 h-24 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-400/50">
              <svg width="40" height="50" viewBox="0 0 18 22" fill="none">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-lg"/>
              </svg>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">Logo · Round</p>
        </div>

        {/* Speed Sticker - Si la velocidad emociona */}
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-red-500 to-yellow-400 rounded-xl p-6 aspect-square flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs font-black text-white mb-1">SI LA VELOCIDAD</p>
              <p className="text-xs font-black text-white">EMOCIONA</p>
              <div className="my-2 h-px bg-white/50" />
              <p className="text-xs font-black text-black">LA FRICCIÓN MATA</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">Speed · Square</p>
        </div>

        {/* Alice in Wonderland - Time sticker */}
        <div className="space-y-3">
          <div className="bg-[#0a0a0a] border-2 border-yellow-400 rounded-xl p-6 aspect-square flex items-center justify-center">
            <div className="text-center space-y-1">
              <p className="text-[10px] text-yellow-400 italic leading-tight">"How much is forever?"</p>
              <p className="text-xs text-zinc-400 font-semibold">Sometimes,</p>
              <p className="text-sm text-yellow-400 font-bold">just a second.</p>
              <p className="text-[8px] text-zinc-600 mt-2">— Alice ⚡</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">Time · Quote</p>
        </div>

        {/* Fast vs Slow - Humor */}
        <div className="space-y-3">
          <div className="bg-yellow-400 rounded-xl p-6 aspect-square flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl mb-2">⚡</p>
              <p className="text-sm font-bold text-black">FAST</p>
              <p className="text-xs text-black/70">or</p>
              <p className="text-xs text-black line-through">slow</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">Speed · Choice</p>
        </div>

        {/* Time is Performance */}
        <div className="space-y-3">
          <div className="bg-[#111111] border border-yellow-400/30 rounded-lg p-5 aspect-square flex items-center justify-center">
            <div className="text-center space-y-1">
              <p className="text-lg">⏱️</p>
              <p className="text-xs text-yellow-400 font-bold">Time is</p>
              <p className="text-sm text-zinc-300 font-black">PERFORMANCE</p>
              <p className="text-[10px] text-zinc-600">Every ms counts</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">Time · Wisdom</p>
        </div>

        {/* Velocity Joke */}
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl p-5 aspect-square flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs font-bold text-black mb-2">99ms</p>
              <p className="text-[10px] text-black/70 leading-tight">User thinks<br />you're fast</p>
              <div className="my-2 h-px bg-black/20" />
              <p className="text-xs font-bold text-black">1001ms</p>
              <p className="text-[10px] text-black/70 leading-tight">User left</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">Reality · Truth</p>
        </div>

        {/* Loading Screen Joke */}
        <div className="space-y-3">
          <div className="bg-white rounded-lg p-6 aspect-square flex items-center justify-center border-2 border-zinc-200">
            <div className="text-center space-y-2">
              <div className="flex justify-center gap-1">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
              <p className="text-xs text-zinc-400 line-through">Loading...</p>
              <p className="text-sm font-bold text-black">RELAMPO</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">No Wait · Promise</p>
        </div>

        {/* RPM Meter Style */}
        <div className="space-y-3">
          <div className="bg-[#0a0a0a] border-2 border-red-500 rounded-xl p-5 aspect-square flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs text-red-400 font-mono">REDLINE</p>
              <p className="text-3xl font-black text-yellow-400">⚡</p>
              <p className="text-[10px] text-zinc-500 leading-tight">Performance<br />at the limit</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">Extreme · Racing</p>
        </div>

        {/* Slow = Broken */}
        <div className="space-y-3">
          <div className="bg-gradient-to-br from-zinc-900 to-black border border-yellow-400/50 rounded-lg p-5 aspect-square flex items-center justify-center">
            <div className="text-center space-y-1">
              <p className="text-lg">🐌</p>
              <p className="text-xs text-zinc-500 line-through">Slow</p>
              <p className="text-xs text-red-400 font-bold">= Broken</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">Truth · Fact</p>
        </div>

        {/* Blink and you'll miss it */}
        <div className="space-y-3">
          <div className="bg-yellow-400 rounded-xl p-6 aspect-square flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs font-bold text-black mb-1">Blink and</p>
              <p className="text-sm font-black text-black">you'll miss it</p>
              <p className="text-2xl mt-1">👁️</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">Speed · Humor</p>
        </div>

        {/* Patience is NOT a virtue */}
        <div className="space-y-3">
          <div className="bg-[#111111] border border-white/5 rounded-xl p-5 aspect-square flex items-center justify-center">
            <div className="text-center space-y-1">
              <p className="text-xs text-zinc-500">Patience is</p>
              <p className="text-sm font-black text-red-400">NOT</p>
              <p className="text-xs text-zinc-500">a virtue here</p>
              <p className="text-lg mt-1">⚡</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">Impatience · Real</p>
        </div>

        {/* Milliseconds Matter */}
        <div className="space-y-3">
          <div className="bg-black border-2 border-yellow-400 rounded-lg p-5 aspect-square flex items-center justify-center">
            <div className="text-center">
              <p className="text-xs text-yellow-400 font-mono mb-1">001ms</p>
              <p className="text-xs text-yellow-400 font-mono">010ms</p>
              <p className="text-xs text-yellow-400 font-mono mb-2">100ms</p>
              <p className="text-[10px] text-zinc-400">Every one counts</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">Precision · Tech</p>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={() => onDownload('Sticker Pack', 'stickers')}>
          <Download className="w-4 h-4 mr-2" />
          Download Sticker Pack
        </Button>
      </div>
    </div>
  );
}

// Coaster Designs
function CoasterDesigns({ onDownload }: { onDownload: (materialName: string, materialType?: MaterialType) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Coasters</h2>
        <p className="text-zinc-400">10cm × 10cm · Cork back · Premium quality</p>
      </div>

      <div className="grid grid-cols-2 gap-8 max-w-2xl">
        <div className="space-y-4">
          <div className="bg-[#0a0a0a] border border-yellow-400/30 rounded-2xl p-12 aspect-square flex items-center justify-center">
            <div className="text-center">
              <div className="relative w-20 h-20 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-yellow-400/50 mx-auto mb-4">
                <svg width="36" height="44" viewBox="0 0 18 22" fill="none">
                  <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-lg"/>
                </svg>
              </div>
              <div className="text-xs text-zinc-500 font-mono">RELAMPO</div>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">Minimal · Logo</p>
        </div>

        <div className="space-y-4">
          <div className="bg-yellow-400 rounded-2xl p-12 aspect-square flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-bold text-black mb-2">Performance<br />testing</p>
              <p className="text-xs text-black/70">made simple</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">Bold · Message</p>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={() => onDownload('Coasters', 'coasters')}>
          <Download className="w-4 h-4 mr-2" />
          Download Coaster Designs
        </Button>
      </div>
    </div>
  );
}

// Bottle Designs
function BottleDesigns({ onDownload }: { onDownload: (materialName: string, materialType?: MaterialType) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Water Bottles</h2>
        <p className="text-zinc-400">750ml · Stainless steel · Laser engraved</p>
      </div>

      <div className="max-w-md mx-auto">
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-12 flex items-center justify-center" style={{ height: '500px' }}>
          <div className="relative w-32 h-96 bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-full border-2 border-zinc-700 flex flex-col items-center justify-center text-center shadow-2xl">
            {/* Logo */}
            <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center mb-4">
              <svg width="20" height="24" viewBox="0 0 18 22" fill="none">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="black"/>
              </svg>
            </div>
            {/* Vertical Text */}
            <div className="transform rotate-0 space-y-4">
              <p className="text-xs font-bold text-zinc-400 tracking-wider">RELAMPO</p>
              <p className="text-[10px] text-zinc-600 leading-relaxed">Performance<br />testing<br />made<br />simple</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={() => onDownload('Water Bottles', 'bottle')}>
            <Download className="w-4 h-4 mr-2" />
            Download Bottle Design
          </Button>
        </div>
      </div>
    </div>
  );
}

// Tote Bag Designs
function ToteBagDesigns({ onDownload }: { onDownload: (materialName: string, materialType?: MaterialType) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Tote Bags</h2>
        <p className="text-zinc-400">38cm × 42cm · Cotton canvas · Screen printed</p>
      </div>

      <div className="grid grid-cols-2 gap-8 max-w-4xl">
        {/* Natural Color */}
        <div className="space-y-4">
          <div className="bg-[#f5f1e8] rounded-xl p-16 aspect-[3/4] flex items-center justify-center border-2 border-[#e5dcc8]">
            <div className="text-center">
              <div className="relative w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-xl mb-6 mx-auto">
                <svg width="36" height="44" viewBox="0 0 18 22" fill="none">
                  <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white"/>
                </svg>
              </div>
              <p className="text-3xl font-black text-black mb-2">RELAMPO</p>
              <p className="text-sm text-zinc-700">Trust your performance tests</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">Natural Canvas</p>
        </div>

        {/* Black Color */}
        <div className="space-y-4">
          <div className="bg-black rounded-xl p-16 aspect-[3/4] flex items-center justify-center">
            <div className="text-center">
              <div className="relative w-20 h-20 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-yellow-400/50 mb-6 mx-auto">
                <svg width="36" height="44" viewBox="0 0 18 22" fill="none">
                  <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="black"/>
                </svg>
              </div>
              <p className="text-3xl font-black text-white mb-2">RELAMPO</p>
              <p className="text-sm text-zinc-400">Performance testing made simple</p>
            </div>
          </div>
          <p className="text-sm text-zinc-400 text-center">Black Canvas</p>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={() => onDownload('Tote Bags', 'totebag')}>
          <Download className="w-4 h-4 mr-2" />
          Download Tote Bag Designs
        </Button>
      </div>
    </div>
  );
}

// Table Cover Design
function TableCoverDesign({ onPrint }: { onPrint: () => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Table Cover</h2>
        <p className="text-zinc-400">183cm × 76cm · Polyester · Sponsor booth</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-[#0a0a0a] border border-yellow-400/30 rounded-xl p-12 aspect-[183/76]">
          <div className="h-full flex items-center justify-between px-12">
            {/* Left: Logo */}
            <div className="relative w-32 h-32 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-yellow-400/50">
              <svg width="56" height="70" viewBox="0 0 18 22" fill="none">
                <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white" className="drop-shadow-2xl"/>
              </svg>
            </div>

            {/* Center: Brand + Message */}
            <div className="text-center flex-1 px-12">
              <h1 className="text-6xl font-black text-zinc-100 tracking-tighter mb-4">
                RELAMPO
              </h1>
              <p className="text-2xl font-semibold text-yellow-400 mb-6">
                Performance testing made simple.
              </p>
              <div className="flex items-center justify-center gap-6 text-sm text-zinc-400">
                <span>Declarative YAML</span>
                <span>·</span>
                <span>Traffic Recording</span>
                <span>·</span>
                <span>Auto-Correlation</span>
              </div>
            </div>

            {/* Right: QR Placeholder */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-32 h-32 bg-white rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs text-zinc-800 font-bold mb-1">QR CODE</div>
                  <div className="text-[10px] text-zinc-500">Docs</div>
                </div>
              </div>
              <p className="text-xs text-zinc-500">relampo.dev</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={onPrint}>
            <Printer className="w-4 h-4 mr-2" />
            Send to Print Shop
          </Button>
        </div>
      </div>
    </div>
  );
}

// Info Cards
function InfoCards({ onDownload }: { onDownload: (materialName: string, materialType?: MaterialType) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Info Cards</h2>
        <p className="text-zinc-400">10cm × 15cm · 350gsm · Handouts</p>
      </div>

      <div className="grid grid-cols-2 gap-8 max-w-3xl">
        {/* Front */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Front</h3>
          <div className="bg-[#0a0a0a] border border-yellow-400/30 rounded-xl p-8 aspect-[10/15]">
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="relative w-16 h-16 bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-xl shadow-yellow-400/50 mb-6">
                <svg width="28" height="36" viewBox="0 0 18 22" fill="none">
                  <path d="M10.5 0L0 12.5H7.5L6 22L18 9H10.5V0Z" fill="white"/>
                </svg>
              </div>
              <h3 className="text-3xl font-black text-zinc-100 mb-3">RELAMPO</h3>
              <p className="text-sm text-yellow-400 font-semibold mb-6">Performance testing<br />made simple.</p>
              <div className="text-xs text-zinc-500 space-y-1">
                <p>✓ Declarative YAML</p>
                <p>✓ Real traffic recording</p>
                <p>✓ Auto-correlation</p>
              </div>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Back</h3>
          <div className="bg-[#111111] border border-white/5 rounded-xl p-8 aspect-[10/15]">
            <div className="h-full flex flex-col justify-between text-sm text-zinc-400">
              <div>
                <h4 className="text-lg font-bold text-zinc-100 mb-3">What is Relampo?</h4>
                <p className="text-sm leading-relaxed mb-4">
                  A modern performance testing tool that turns real HTTP traffic into trustworthy, declarative load tests.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Docs</div>
                  <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                    <div className="text-[8px] text-center text-zinc-800 font-bold">QR<br />CODE</div>
                  </div>
                </div>
                <div className="text-xs text-zinc-500 font-mono">
                  relampo.dev<br />
                  github.com/relampo
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <Button className="bg-yellow-400 text-black hover:bg-yellow-300" onClick={() => onDownload('Info Cards', 'cards')}>
          <Download className="w-4 h-4 mr-2" />
          Download Info Cards
        </Button>
      </div>
    </div>
  );
}