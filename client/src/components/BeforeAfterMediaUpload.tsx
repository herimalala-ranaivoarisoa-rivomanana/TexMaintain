import { useState } from 'react';
import { Upload, X, Image as ImageIcon, FileVideo } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { uploadMedia } from '@/api/media';
import { useToast } from '@/hooks/useToast';

interface BeforeAfterMediaUploadProps {
    mediaBefore: string[];
    mediaAfter: string[];
    onMediaBeforeChange: (urls: string[]) => void;
    onMediaAfterChange: (urls: string[]) => void;
    readonly?: boolean;
}

export function BeforeAfterMediaUpload({
    mediaBefore,
    mediaAfter,
    onMediaBeforeChange,
    onMediaAfterChange,
    readonly = false
}: BeforeAfterMediaUploadProps) {
    const [uploadingBefore, setUploadingBefore] = useState(false);
    const [uploadingAfter, setUploadingAfter] = useState(false);
    const { toast } = useToast();

    const handleUpload = async (
        files: FileList | null,
        type: 'before' | 'after'
    ) => {
        if (!files || files.length === 0) return;

        const setUploading = type === 'before' ? setUploadingBefore : setUploadingAfter;
        const currentMedia = type === 'before' ? mediaBefore : mediaAfter;
        const onMediaChange = type === 'before' ? onMediaBeforeChange : onMediaAfterChange;

        try {
            setUploading(true);
            // Convert FileList to Array
            const fileArray = Array.from(files);

            const response = await uploadMedia(fileArray);

            if (response && response.success && response.urls) {
                onMediaChange([...currentMedia, ...response.urls]);
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

    const removeMedia = (index: number, type: 'before' | 'after') => {
        const currentMedia = type === 'before' ? mediaBefore : mediaAfter;
        const onMediaChange = type === 'before' ? onMediaBeforeChange : onMediaAfterChange;

        const newMedia = [...currentMedia];
        newMedia.splice(index, 1);
        onMediaChange(newMedia);
    };

    const MediaList = ({ urls, type }: { urls: string[], type: 'before' | 'after' }) => (
        <div className="grid grid-cols-2 gap-2 mt-2">
            {urls.map((url, index) => {
                const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg)$/);
                return (
                    <div key={index} className="relative group aspect-video bg-slate-100 rounded-md overflow-hidden border">
                        {isVideo ? (
                            <video src={url} className="w-full h-full object-cover" controls />
                        ) : (
                            <img src={url} alt={`${type} ${index + 1}`} className="w-full h-full object-cover" />
                        )}

                        {!readonly && (
                            <button
                                onClick={() => removeMedia(index, type)}
                                className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                type="button"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                            <span className="text-xs text-white flex items-center gap-1">
                                {isVideo ? <FileVideo className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                                {type === 'before' ? 'Before' : 'After'}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const UploadZone = ({ type, loading }: { type: 'before' | 'after', loading: boolean }) => (
        <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
            <input
                type="file"
                id={`media-upload-${type}`}
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files, type)}
                disabled={loading || readonly}
            />
            <label htmlFor={`media-upload-${type}`} className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className={`h-6 w-6 ${loading ? 'animate-bounce text-blue-500' : 'text-slate-400'}`} />
                <span className="text-sm text-slate-600 font-medium">
                    {loading ? 'Uploading...' : `Add "${type === 'before' ? 'Before' : 'After'}" Media`}
                </span>
                <span className="text-xs text-slate-400">Images or Videos</span>
            </label>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before Department */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        State Before
                        <span className="text-xs font-normal text-slate-500">(Initial condition)</span>
                    </Label>

                    <MediaList urls={mediaBefore} type="before" />

                    {!readonly && <UploadZone type="before" loading={uploadingBefore} />}
                </div>

                {/* After Department */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        State After
                        <span className="text-xs font-normal text-slate-500">(Final result)</span>
                    </Label>

                    <MediaList urls={mediaAfter} type="after" />

                    {!readonly && <UploadZone type="after" loading={uploadingAfter} />}
                </div>
            </div>
        </div>
    );
}
