"use client";
import Link from "next/link";
import { Phone, Mail, MapPin, Heart, ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer
      style={{
        position: "relative",
        background:
          "linear-gradient(180deg, #0f0f0f 0%, #121212 40%, #0b0b0b 100%)",
        color: "#fff",
        padding: "90px 20px 40px",
        overflow: "hidden",
      }}
    >
      {/* glow orbs */}
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "radial-gradient(circle,#C41E73 0%, transparent 70%)",
          opacity: 0.12,
          top: -120,
          right: -120,
          filter: "blur(80px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle,#E91E63 0%, transparent 70%)",
          opacity: 0.12,
          bottom: -100,
          left: -100,
          filter: "blur(80px)",
        }}
      />

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: "60px",
            marginBottom: 60,
          }}
        >
          {/* BRAND */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background:
                    "linear-gradient(135deg,#C41E73 0%,#E91E63 60%,#FF4DA6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 20,
                }}
              >
                F
              </div>

              <span
                style={{
                  fontSize: 24,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
              >
                Picoso
              </span>
            </div>

            <p
              style={{
                color: "rgba(255,255,255,.6)",
                fontSize: 14,
                lineHeight: 1.7,
                maxWidth: 260,
              }}
            >
              Precision nutrition bowls designed for performance, recovery and
              everyday energy. Built for modern fitness lifestyles.
            </p>
          </div>

          {/* LINKS */}
          <FooterCol title="Menu">
            <FooterLink href="/bowls">Browse Bowls</FooterLink>
            <FooterLink href="/custom">Custom Bowl</FooterLink>
            <FooterLink href="/orders">Track Order</FooterLink>
          </FooterCol>

          <FooterCol title="Company">
            <FooterLink href="/about">About</FooterLink>
            <FooterLink href="/contact">Contact</FooterLink>
            <FooterLink href="/careers">Careers</FooterLink>
          </FooterCol>

          {/* CONTACT */}
          <div>
            <h4 className="footerTitle">Contact</h4>

            <div className="footerContact">
              <Phone size={16} />
              <a href="tel:8167080111">8167080111</a>
            </div>

            <div className="footerContact">
              <Mail size={16} />
              <a href="mailto:hello@picoso.com">hello@picoso.com</a>
            </div>

            <div className="footerContact">
              <MapPin size={16} />
              <span>Gurugram, India</span>
            </div>
          </div>
        </div>

        {/* BOTTOM */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,.08)",
            paddingTop: 28,
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ color: "rgba(255,255,255,.5)", fontSize: 13 }}>
            © {new Date().getFullYear()} Picoso. All rights reserved.
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "rgba(255,255,255,.6)",
              fontSize: 13,
            }}
          >
            Made with
            <Heart
              size={14}
              fill="#E91E63"
              style={{ marginTop: 1, marginLeft: 4 }}
            />
            for high-performance living
          </div>
        </div>
      </div>

      {/* styles */}
      <style jsx>{`
        .footerTitle {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 18px;
          letter-spacing: 0.04em;
          color: #fff;
        }

        .footerLink {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.55);
          text-decoration: none;
          margin-bottom: 12px;
          transition: 0.3s;
        }

        .footerLink:hover {
          color: #fff;
          transform: translateX(4px);
        }

        .footerContact {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          margin-bottom: 14px;
        }

        .footerContact a {
          color: inherit;
          text-decoration: none;
          transition: 0.3s;
        }

        .footerContact a:hover {
          color: #fff;
        }

        @media (max-width: 700px) {
          footer {
            padding: 70px 18px 40px;
          }
        }
      `}</style>
    </footer>
  );
}

function FooterCol({ title, children }) {
  return (
    <div>
      <h4 className="footerTitle">{title}</h4>
      {children}
    </div>
  );
}

function FooterLink({ href, children }) {
  return (
    <Link href={href} className="footerLink">
      <span className="flex items-center gap-1">
        {children}
        <ArrowUpRight size={14} />
      </span>
    </Link>
  );
}
