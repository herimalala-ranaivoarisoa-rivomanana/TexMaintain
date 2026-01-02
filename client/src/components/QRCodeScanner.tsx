import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface QRCodeScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (decodedText: string) => void;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ isOpen, onClose, onScan }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Small timeout to ensure DOM is ready
            const timer = setTimeout(() => {
                try {
                    if (!scannerRef.current) {
                        scannerRef.current = new Html5QrcodeScanner(
                            "reader",
                            {
                                fps: 10,
                                qrbox: { width: 250, height: 250 },
                                aspectRatio: 1.0,
                                showTorchButtonIfSupported: true
                            },
              /* verbose= */ false
                        );

                        scannerRef.current.render(
                            (decodedText) => {
                                onScan(decodedText);
                                onClose();
                            },
                            (errorMessage) => {
                                // Ignore errors during scanning as they happen frequently when no QR code is in view
                                // console.log(errorMessage);
                            }
                        );
                    }
                } catch (err) {
                    console.error("Failed to initialize scanner", err);
                    setScanError("Failed to initialize camera. Please ensure camera permissions are granted.");
                }
            }, 100);

            return () => {
                clearTimeout(timer);
                if (scannerRef.current) {
                    try {
                        scannerRef.current.clear().catch(console.error);
                        scannerRef.current = null;
                    } catch (e) {
                        console.error("Error clearing scanner", e);
                    }
                }
            };
        }
    }, [isOpen, onScan, onClose]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px] bg-white">
                <DialogHeader>
                    <DialogTitle>Scan QR Code</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-4">
                    {scanError ? (
                        <div className="text-red-500 text-center mb-4">{scanError}</div>
                    ) : (
                        <div id="reader" className="w-full max-w-[400px] overflow-hidden rounded-lg"></div>
                    )}
                    <p className="text-sm text-slate-500 mt-4 text-center">
                        Point your camera at a QR code to scan it.
                    </p>
                    <Button onClick={onClose} variant="outline" className="mt-4">
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
