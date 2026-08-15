export default function ShopLogo({ logoDataUrl, size = 30 }) {
  if (logoDataUrl) {
    return <img src={logoDataUrl} alt="โลโก้ร้าน" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #14151f" }} />;
  }
  return <div className="pgs-ball" style={{ width: size, height: size }} />;
}
