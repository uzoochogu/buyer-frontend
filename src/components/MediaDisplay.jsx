/* eslint-disable react-hooks/rules-of-hooks */
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { mediaCache } from "../utils/mediaCache";
import { mediaService } from "../api/services";

// Placeholder image paths
const IMAGE_PLACEHOLDER = "/placeholder-image.png";
const VIDEO_PLACEHOLDER = "/placeholder-video.png";

// Memoized - prevents unnecessary re-renders
const VideoThumbnail = React.memo(
  ({ src, className, onClick }) => {
    const videoRef = useRef(null);
    const [thumbnail, setThumbnail] = useState(null);
    const [, setError] = useState(false);
    const thumbnailGeneratedRef = useRef(false);
    const processingRef = useRef(false);

    const generateThumbnail = useCallback(() => {
      if (thumbnailGeneratedRef.current || processingRef.current) return;

      const video = videoRef.current;
      if (!video || !video.videoWidth) return;

      processingRef.current = true;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL("image/jpeg");
        setThumbnail(dataUrl);
        thumbnailGeneratedRef.current = true;
      } catch (e) {
        console.error("Error generating thumbnail:", e);
        setError(true);
      } finally {
        processingRef.current = false;
      }
    }, []);

    useEffect(() => {
      // Reset
      setThumbnail(null);
      setError(false);
      thumbnailGeneratedRef.current = false;
      processingRef.current = false;

      const video = videoRef.current;
      if (!video || !src) return;

      // allows canvas operations
      video.crossOrigin = "anonymous";

      const handleLoadedMetadata = () => {
        console.log("Video metadata loaded");
      };

      const handleLoadedData = () => {
        try {
          if (!thumbnailGeneratedRef.current && !processingRef.current) {
            console.log("Seeking video to generate thumbnail");
            video.currentTime = Math.min(1, video.duration * 0.25);
          }
        } catch (e) {
          console.error("Error seeking video:", e);
          setError(true);
        }
      };

      const handleSeeked = () => {
        console.log("Video seeked, generating thumbnail");
        generateThumbnail();
      };

      const handleError = () => {
        console.error("Video load error");
        setError(true);
      };

      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("loadeddata", handleLoadedData);
      video.addEventListener("seeked", handleSeeked);
      video.addEventListener("error", handleError);

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("seeked", handleSeeked);
        video.removeEventListener("error", handleError);

        // Cancel any pending operations
        processingRef.current = false;
      };
    }, [src, generateThumbnail]);

    const handleClick = useCallback(
      (e) => {
        e.stopPropagation(); // Prevent click event from bubbling to parent
        if (onClick) onClick(e);
      },
      [onClick]
    );

    return (
      <div className={className} onClick={handleClick}>
        <video
          ref={videoRef}
          src={src}
          className="hidden"
          preload="metadata"
          crossOrigin="anonymous"
        />
        <div className="relative w-full h-full">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt="Video thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={VIDEO_PLACEHOLDER}
              alt="Video placeholder"
              className="w-full h-full object-cover"
            />
          )}

          {/* Play button overlay V1 */}
          {/* <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black bg-opacity-40 p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
          </div>
        </div> */}

          {/* Play button overlay V2 */}
          <div className="absolute inset-0 flex items-center justify-center bg-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for React.memo
    // Only re-render if the src changes
    return prevProps.src === nextProps.src;
  }
);

// Main MediaDisplay component
const MediaDisplay = ({ mediaItems, compact = false }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [mediaUrls, setMediaUrls] = useState({});
  const [loading, setLoading] = useState({});
  const mediaUrlsRef = useRef(mediaUrls);

  useEffect(() => {
    mediaUrlsRef.current = mediaUrls; // ref update
  }, [mediaUrls]);

  if (!mediaItems || mediaItems.length === 0) {
    return null;
  }

  const isImage = (type) => type.startsWith("image/");
  const isVideo = (type) => type.startsWith("video/");

  // Memoized
  const getMediaUrl = useCallback(async (objectKey) => {
    if (mediaUrlsRef.current[objectKey]) {
      return mediaUrlsRef.current[objectKey];
    }

    // cache check
    const cached = mediaCache.get(objectKey);
    if (cached) {
      // Update state but don't wait for it
      setMediaUrls((prev) => ({ ...prev, [objectKey]: cached }));
      return cached;
    }

    // For public media, construct direct URL
    const baseUrl = import.meta.env.VITE_MEDIA_SERVER_URL || "";
    var directUrl = `${baseUrl}/media/${objectKey}`;

    try {
      // presigned URL
      const response = await mediaService.getViewUrl(objectKey);
      if (response?.data?.download_url) {
        directUrl = response.data.download_url;
      }
    } catch (error) {
      console.error("Failed to get view URL:", error);
    }

    // Cache URL
    mediaCache.set(objectKey, directUrl);

    // Update state but don't wait for it
    setMediaUrls((prev) => ({ ...prev, [objectKey]: directUrl }));
    return directUrl;
  }, []);

  // Load media URLs only once per object key
  useEffect(() => {
    const loadMediaUrls = async () => {
      const loadingStates = {};

      for (const media of mediaItems) {
        const objectKey =
          typeof media === "string" ? media : media.objectKey || media.url;

        // Skip if we already have this URL
        if (objectKey && !mediaUrlsRef.current[objectKey]) {
          loadingStates[objectKey] = true;
          setLoading((prev) => ({ ...prev, [objectKey]: true }));

          try {
            await getMediaUrl(objectKey);
          } catch (error) {
            console.error("Failed to load media URL:", error);
          }

          loadingStates[objectKey] = false;
          setLoading((prev) => ({ ...prev, [objectKey]: false }));
        }
      }
    };

    loadMediaUrls();
  }, [mediaItems, getMediaUrl]);

  // Process media items to ensure consistent format - memoized to prevent unnecessary recalculations
  const processedMedia = useMemo(() => {
    // console.log('Raw media:', mediaItems); // for debugging
    return mediaItems.map((media) => {
      const objectKey =
        typeof media === "string" ? media : media.objectKey || media.url;
      const type =
        media.type ||
        (objectKey.match(/\.(jpg|jpeg|png|gif|webp)$/i)
          ? "image/jpeg"
          : objectKey.match(/\.(mp4|mov|webm)$/i)
          ? "video/mp4"
          : "application/octet-stream");

      return {
        objectKey,
        url: media.preview || mediaUrls[objectKey] || media.url,
        type,
        name: media.name || objectKey.split("/").pop(),
        loading: loading[objectKey] || false,
      };
    });
  }, [mediaItems, mediaUrls, loading]);

  // Stable event handlers
  const openLightbox = useCallback((index) => {
    setActiveIndex(index);
    setShowLightbox(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setShowLightbox(false);
  }, []);

  const nextMedia = useCallback(
    (e) => {
      e.stopPropagation();
      setActiveIndex((prev) => (prev + 1) % processedMedia.length);
    },
    [processedMedia.length]
  );

  const prevMedia = useCallback(
    (e) => {
      e.stopPropagation();
      setActiveIndex(
        (prev) => (prev - 1 + processedMedia.length) % processedMedia.length
      );
    },
    [processedMedia.length]
  );

  // Compact view for messages, cards, etc.
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {processedMedia.map((media, index) => (
          <div
            key={`${media.objectKey}-${index}`}
            className="cursor-pointer hover:opacity-80 transition-opacity relative"
            onClick={() => openLightbox(index)}
          >
            {media.loading ? (
              <div className="w-20 h-20 bg-gray-200 rounded border border-gray-200 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            ) : isImage(media.type) ? (
              <img
                src={media.url}
                alt={media.name}
                className="w-20 h-20 object-cover rounded border border-gray-200"
                loading="lazy"
                onError={(e) => {
                  e.target.src = IMAGE_PLACEHOLDER;
                }}
              />
            ) : isVideo(media.type) ? (
              <VideoThumbnail
                src={media.url}
                className="w-20 h-20 rounded border border-gray-200 overflow-hidden"
                onClick={() => openLightbox(index)}
              />
            ) : (
              <div className="w-20 h-20 flex items-center justify-center bg-gray-100 rounded border border-gray-200">
                <span className="text-xs text-gray-500 p-1 text-center overflow-hidden">
                  {media.name}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Lightbox for compact view */}
        {showLightbox && (
          <MediaLightbox
            media={processedMedia[activeIndex]}
            onClose={closeLightbox}
            onNext={processedMedia.length > 1 ? nextMedia : null}
            onPrev={processedMedia.length > 1 ? prevMedia : null}
          />
        )}
      </div>
    );
  }

  // Full view for posts
  return (
    <div>
      <div
        className={`grid ${
          processedMedia.length > 1 ? "grid-cols-2" : "grid-cols-1"
        } gap-2 mt-3`}
      >
        {processedMedia.map((media, index) => (
          <div
            key={`${media.objectKey}-${index}`}
            className="cursor-pointer relative hover:opacity-90 transition-opacity"
            onClick={() => openLightbox(index)}
          >
            {media.loading ? (
              <div className="w-full h-48 bg-gray-200 rounded flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : isImage(media.type) ? (
              <img
                src={media.url}
                alt={media.name}
                className="w-full h-48 object-cover rounded"
                loading="lazy"
                onError={(e) => {
                  e.target.src = IMAGE_PLACEHOLDER;
                }}
              />
            ) : isVideo(media.type) ? (
              <VideoThumbnail
                src={media.url}
                className="relative w-full h-48 bg-black rounded overflow-hidden"
                onClick={() => openLightbox(index)}
              />
            ) : (
              <div className="w-full h-48 flex items-center justify-center bg-gray-100 rounded">
                <span className="text-gray-500">{media.name}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox for full view */}
      {showLightbox && (
        <MediaLightbox
          media={processedMedia[activeIndex]}
          onClose={closeLightbox}
          onNext={processedMedia.length > 1 ? nextMedia : null}
          onPrev={processedMedia.length > 1 ? prevMedia : null}
        />
      )}
    </div>
  );
};

// Memoized lightbox component
const MediaLightbox = React.memo(({ media, onClose, onNext, onPrev }) => {
  const [videoError, setVideoError] = useState(false);
  const isImage = (type) => type.startsWith("image/");
  const isVideo = (type) => type.startsWith("video/");

  const handleVideoError = useCallback((e) => {
    console.error("Video playback error:", e);
    setVideoError(true);
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4"
      // className="fixed inset-0 bg-none bg-opacity-95 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
        onClick={onClose}
      >
        ×
      </button>

      {onPrev && (
        <button
          className="absolute left-4 text-white text-4xl hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
          onClick={onPrev}
        >
          ‹
        </button>
      )}

      {onNext && (
        <button
          className="absolute right-4 text-white text-4xl hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full w-12 h-12 flex items-center justify-center"
          onClick={onNext}
        >
          ›
        </button>
      )}

      <div
        className="max-w-4xl max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage(media.type) ? (
          <img
            src={media.url}
            alt={media.name}
            className="max-h-[90vh] max-w-full object-contain"
            onError={(e) => {
              e.target.src = IMAGE_PLACEHOLDER;
            }}
          />
        ) : isVideo(media.type) ? (
          <div className="relative">
            {videoError ? (
              <div className="bg-gray-800 text-white p-8 rounded flex flex-col items-center">
                <img
                  src={VIDEO_PLACEHOLDER}
                  alt="Video unavailable"
                  className="w-32 h-32 mb-4"
                />
                <p>Unable to load video</p>
                <p className="text-sm text-gray-400 mt-2">{media.name}</p>
              </div>
            ) : (
              <video
                src={media.url}
                className="max-h-[90vh] max-w-full"
                controls
                autoPlay
                playsInline
                onError={handleVideoError}
                poster={VIDEO_PLACEHOLDER}
                crossOrigin="anonymous"
              />
            )}
          </div>
        ) : (
          <div className="bg-white p-8 rounded">
            <p>{media.name}</p>
            <p className="text-sm text-gray-500 mt-2">
              File type not supported for preview
            </p>
          </div>
        )}
      </div>

      {/* Media info */}
      <div className="absolute bottom-4 left-4 text-white bg-black bg-opacity-50 px-3 py-1 rounded">
        {media.name}
      </div>
    </div>
  );
});

export default MediaDisplay;
