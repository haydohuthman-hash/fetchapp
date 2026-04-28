Add-Type -AssemblyName System.Drawing

$source = 'C:\Users\User\.cursor\projects\c-Users-User-Downloads-fetchapp-main\assets\c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_a1e10569e9af8e14866bbc2c3f62b3ad_images_ChatGPT_Image_Apr_28__2026__04_11_30_PM-c9a75564-8c39-4275-8daf-7caeaa9e6217.png'
$outDir = Join-Path $PSScriptRoot '..\src\assets\pokies-icons'
$outDir = (Resolve-Path $outDir).Path

$cs = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class PokieCropper
{
    public class Cell
    {
        public string Name;
        public int Col;
        public int Row;
        public int Cols;
        public Cell(string n, int c, int r, int cs) { Name = n; Col = c; Row = r; Cols = cs; }
    }

    public static void Run(string sourcePath, string outDir)
    {
        // Cell layout. row1 + row2 = 7 cells across; row3 = 6 cells across.
        Cell[] cells = new Cell[] {
            new Cell("gem", 0, 0, 7),
            new Cell("bid-boost", 1, 0, 7),
            new Cell("fast-bid", 2, 0, 7),
            new Cell("mystery-prize", 3, 0, 7),
            new Cell("top-bidder", 4, 0, 7),
            new Cell("free-shipping", 5, 0, 7),
            new Cell("discount-delivery", 6, 0, 7),
            new Cell("marketplace-discount", 0, 1, 7),
            new Cell("coins", 1, 1, 7),
            new Cell("cashback", 2, 1, 7),
            new Cell("jackpot", 3, 1, 7),
            new Cell("golden-fetch", 4, 1, 7),
            new Cell("vip-pass", 5, 1, 7),
            new Cell("seller-boost", 6, 1, 7),
            new Cell("extra-spin", 0, 2, 6),
            new Cell("shield-protection", 1, 2, 6),
            new Cell("lucky-clover", 2, 2, 6),
            new Cell("treasure-chest", 3, 2, 6),
            new Cell("daily-bonus", 4, 2, 6),
            new Cell("wild", 5, 2, 6),
        };

        const int bgThreshold = 28;        // pixels with max(R,G,B) <= threshold are pure background
        const int feather = 18;            // smooth alpha ramp above threshold
        const int padding = 12;            // padding around detected bounding box (px)

        using (var src = (Bitmap)Image.FromFile(sourcePath))
        {
            int W = src.Width;
            int H = src.Height;
            int rowH = H / 3;

            // Read whole bitmap into a managed byte array for speed
            var bmpData = src.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            int stride = bmpData.Stride;
            byte[] buf = new byte[stride * H];
            Marshal.Copy(bmpData.Scan0, buf, 0, buf.Length);
            src.UnlockBits(bmpData);

            foreach (Cell c in cells)
            {
                int cellW = W / c.Cols;
                int x0 = c.Col * cellW;
                int x1 = (c.Col == c.Cols - 1) ? W : (c.Col + 1) * cellW;
                int y0 = c.Row * rowH;
                int y1 = (c.Row == 2) ? H : (c.Row + 1) * rowH;

                // Detect bounding box of non-background content within the cell.
                int minX = x1, maxX = x0, minY = y1, maxY = y0;
                bool found = false;
                for (int y = y0; y < y1; y++)
                {
                    for (int x = x0; x < x1; x++)
                    {
                        int o = y * stride + x * 4;
                        byte b = buf[o];
                        byte g = buf[o + 1];
                        byte r = buf[o + 2];
                        int m = r; if (g > m) m = g; if (b > m) m = b;
                        if (m > bgThreshold)
                        {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                            found = true;
                        }
                    }
                }
                if (!found) { Console.WriteLine("[skip] " + c.Name + " - no content"); continue; }

                minX = Math.Max(x0, minX - padding);
                maxX = Math.Min(x1 - 1, maxX + padding);
                minY = Math.Max(y0, minY - padding);
                maxY = Math.Min(y1 - 1, maxY + padding);

                int cropW = maxX - minX + 1;
                int cropH = maxY - minY + 1;

                using (var outBmp = new Bitmap(cropW, cropH, PixelFormat.Format32bppArgb))
                {
                    var outData = outBmp.LockBits(new Rectangle(0, 0, cropW, cropH), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                    int oStride = outData.Stride;
                    byte[] outBuf = new byte[oStride * cropH];

                    for (int y = 0; y < cropH; y++)
                    {
                        for (int x = 0; x < cropW; x++)
                        {
                            int sIdx = (minY + y) * stride + (minX + x) * 4;
                            byte b = buf[sIdx];
                            byte g = buf[sIdx + 1];
                            byte r = buf[sIdx + 2];
                            int m = r; if (g > m) m = g; if (b > m) m = b;
                            byte a;
                            if (m <= bgThreshold) a = 0;
                            else if (m <= bgThreshold + feather) a = (byte)(((m - bgThreshold) * 255) / feather);
                            else a = 255;

                            int oIdx = y * oStride + x * 4;
                            // Pre-multiply not needed; PNG stores straight ARGB.
                            outBuf[oIdx] = b;
                            outBuf[oIdx + 1] = g;
                            outBuf[oIdx + 2] = r;
                            outBuf[oIdx + 3] = a;
                        }
                    }

                    Marshal.Copy(outBuf, 0, outData.Scan0, outBuf.Length);
                    outBmp.UnlockBits(outData);

                    string outPath = Path.Combine(outDir, c.Name + ".png");
                    string tmp = outPath + ".tmp.png";
                    outBmp.Save(tmp, ImageFormat.Png);
                    if (File.Exists(outPath)) File.Delete(outPath);
                    File.Move(tmp, outPath);
                    Console.WriteLine("[ok] " + c.Name + " (" + cropW + "x" + cropH + ")");
                }
            }
        }
    }
}
"@

Add-Type -TypeDefinition $cs -ReferencedAssemblies System.Drawing -ErrorAction Stop
[PokieCropper]::Run($source, $outDir)
Write-Output "Done."
