import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation - matches the trivia question mark icon design
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          borderRadius: '50%',
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'white',
            display: 'flex',
          }}
        >
          ?
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
