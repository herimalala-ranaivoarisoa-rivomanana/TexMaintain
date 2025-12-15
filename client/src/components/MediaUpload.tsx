import { useState } from 'react';
import { Upload, X, Image as ImageIcon, FileVideo } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { uploadMedia } from '@/api/media';

interface MediaUploadProps {
    media: string[];
    onChange: (urls: string[]) => void;
    readonly?: boolean;
    label?: string;
    maxFiles?: number;
}

export function MediaUpload({
    media,
    onChange,
    readonly = false,
    label = "Photos/Videos",
    maxFiles = 5
}: MediaUploadProps) {
    const [uploading, setUploading] = useState(false);
    const { toast } = useToast();

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        if (media.length + files.length > maxFiles) {
            toast({
                title: "Limit exceeded",
                description: `You can only have ${maxFiles} files in total.`,
                variant: "destructive"
            });
            return;
        }

        try {
            setUploading(true);
            const fileArray = Array.from(files);
            const response = await uploadMedia(fileArray);

            if (response && response.success && response.urls) {
                onChange([...media, ...response.urls]);
                toast({
                    title: "Upload successful",
                    description: `${response.urls.length} file(s) uploaded.`
                });
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast({
                title: "Upload failed",
                description: "Could not upload media files.",
                variant: "destructive"
            });
        } finally {
            setUploading(false);
        }
    };

    const removeMedia = (index: number) => {
        const newMedia = [...media];
        newMedia.splice(index, 1);
        onChange(newMedia);
    };

    return (
        <div className="space-y-2">
            {label && <div className="font-semibold text-sm text-slate-700">{label}</div>}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {media.map((url, index) => {
                    const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg)$/);
                    return (
                        <div key={index} className="relative group aspect-square bg-slate-100 rounded-md overflow-hidden border">
                            {isVideo ? (
                                <video src={url} className="w-full h-full object-cover" controls />
                            ) : (
                                <img src={url} alt={`Media ${index + 1}`} className="w-full h-full object-cover" />
                            )}

                            {!readonly && (
                                <button
                                    onClick={() => removeMedia(index)}
                                    className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    type="button"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    );
                })}

                {!readonly && media.length < maxFiles && (
                    <div className="border-2 border-dashed border-slate-200 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center cursor-pointer aspect-square">
                        <input
                            type="file"
                            id="media-single-upload"
                            multiple
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={(e) => handleUpload(e.target.files)}
                            disabled={uploading}
                        />
                        <label htmlFor="media-single-upload" className="cursor-pointer flex flex-col items-center gap-1 p-2 w-full h-full justify-center">
                            <Upload className={`h-6 w-6 ${uploading ? 'animate-bounce text-blue-500' : 'text-slate-400'}`} />
                            <span className="text-xs text-slate-500 font-medium text-center">
                                {uploading ? 'Uploading...' : 'Add Media'}
                            </span>
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
}
