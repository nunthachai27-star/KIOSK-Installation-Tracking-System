import { NextResponse } from 'next/server'

// Digital Asset Links for the KIOSK Android app (TWA, package th.in.bmscloud.kiosktrack).
// The fingerprint is the SHA-256 of the release signing key used by the GitHub Actions
// APK build (.github/workflows/build-apk.yml). It lets the installed app open in
// full screen without the browser URL bar. Served at /.well-known/assetlinks.json.
export function GET() {
  return NextResponse.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'th.in.bmscloud.kiosktrack',
        sha256_cert_fingerprints: [
          '09:B0:44:F0:B7:0B:AD:27:B7:17:A1:63:1F:B9:71:82:DA:15:A9:FD:E3:8C:71:B8:D9:29:03:E4:8D:DE:7D:69',
        ],
      },
    },
  ])
}
