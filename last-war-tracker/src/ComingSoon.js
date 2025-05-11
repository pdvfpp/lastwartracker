import React from 'react';

function ComingSoon({ title }) {
  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>{title}</h1>
      <p style={{ fontSize: '24px', color: '#f9c74f' }}>Coming soon...</p>
    </div>
  );
}

export default ComingSoon;