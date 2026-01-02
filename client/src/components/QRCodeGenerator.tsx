import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface QRCodeGeneratorProps {
    value: string;
    size?: number;
    includeMargin?: boolean;
    imageSettings?: {
        src: string;
        height: number;
        width: number;
        excavate: boolean;
    };
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
    value,
    size = 200,
    includeMargin = true,
    imageSettings
}) => {
    const qrRef = useRef<HTMLDivElement>(null);

    const downloadQRCode = () => {
        const canvas = qrRef.current?.querySelector('canvas');
        if (canvas) {
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = url;
            link.download = `qrcode-${value}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div ref={qrRef} className="bg-white p-4 rounded-lg shadow-sm border">
                <QRCodeCanvas
                    value={value}
                    size={size}
                    includeMargin={includeMargin}
                    imageSettings={imageSettings}
                    level="H"
                />
            </div>
            <Button onClick={downloadQRCode} variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download QR Code
            </Button>
        </div>
    );
};
