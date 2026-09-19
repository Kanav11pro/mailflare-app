import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { ExternalLink } from "lucide-react-native";

interface HtmlRendererProps {
  html: string;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

interface ParsedBlock {
  type: "p" | "h1" | "h2" | "h3" | "blockquote" | "code" | "img" | "hr" | "li";
  content?: string;
  src?: string;
  alt?: string;
  links?: { text: string; href: string }[];
}

function parseHtmlToBlocks(htmlString: string): ParsedBlock[] {
  if (!htmlString || typeof htmlString !== "string") return [];
  const blocks: ParsedBlock[] = [];

  // Remove scripts, styles, head, comments
  let cleanHtml = htmlString
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "");

  // Split into major chunks (paragraphs, headings, blockquotes, images, lists)
  const regex = /<(h1|h2|h3|p|blockquote|pre|li|hr|img|table|tr)[^>]*>([\s\S]*?)<\/\1>|<(img|hr)[^>]*\/?>/gi;
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = regex.exec(cleanHtml)) !== null) {
    const tag = (match[1] || match[3] || "").toLowerCase();
    const innerHtml = match[2] || "";
    const fullMatch = match[0];

    if (tag === "img" || fullMatch.toLowerCase().startsWith("<img")) {
      const srcMatch = fullMatch.match(/src=["']([^"']+)["']/i);
      const altMatch = fullMatch.match(/alt=["']([^"']+)["']/i);
      if (srcMatch && srcMatch[1]) {
        blocks.push({
          type: "img",
          src: srcMatch[1],
          alt: altMatch ? altMatch[1] : undefined,
        });
      }
    } else if (tag === "hr") {
      blocks.push({ type: "hr" });
    } else if (tag === "h1" || tag === "h2" || tag === "h3") {
      const text = decodeHtmlEntities(innerHtml.replace(/<[^>]+>/g, "").trim());
      if (text) blocks.push({ type: tag, content: text });
    } else if (tag === "blockquote") {
      const text = decodeHtmlEntities(innerHtml.replace(/<[^>]+>/g, "").trim());
      if (text) blocks.push({ type: "blockquote", content: text });
    } else if (tag === "pre") {
      const text = decodeHtmlEntities(innerHtml.replace(/<[^>]+>/g, "").trim());
      if (text) blocks.push({ type: "code", content: text });
    } else if (tag === "li") {
      const text = decodeHtmlEntities(innerHtml.replace(/<[^>]+>/g, "").trim());
      if (text) blocks.push({ type: "li", content: text });
    } else {
      // Paragraph or div or table cell
      const strippedText = decodeHtmlEntities(innerHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      if (strippedText) {
        // Extract embedded links if any
        const links: { text: string; href: string }[] = [];
        const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let lMatch;
        while ((lMatch = linkRegex.exec(innerHtml)) !== null) {
          const href = lMatch[1];
          const lText = decodeHtmlEntities(lMatch[2].replace(/<[^>]+>/g, "").trim());
          if (href && lText) {
            links.push({ text: lText, href });
          }
        }

        blocks.push({
          type: "p",
          content: strippedText,
          links: links.length > 0 ? links : undefined,
        });
      }
    }
  }

  // Fallback if regex matched nothing
  if (blocks.length === 0) {
    const rawText = decodeHtmlEntities(cleanHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    if (rawText) {
      blocks.push({ type: "p", content: rawText });
    }
  }

  return blocks;
}

export const HtmlRenderer: React.FC<HtmlRendererProps> = ({ html }) => {
  const blocks = React.useMemo(() => parseHtmlToBlocks(html), [html]);

  const handleLinkPress = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Invalid Link", `Cannot open link: ${url}`);
      }
    } catch {
      Alert.alert("Link Error", `Could not navigate to: ${url}`);
    }
  };

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case "h1":
            return (
              <Text key={index} style={styles.h1}>
                {block.content}
              </Text>
            );
          case "h2":
            return (
              <Text key={index} style={styles.h2}>
                {block.content}
              </Text>
            );
          case "h3":
            return (
              <Text key={index} style={styles.h3}>
                {block.content}
              </Text>
            );
          case "blockquote":
            return (
              <View key={index} style={styles.blockquoteContainer}>
                <Text style={styles.blockquoteText}>{block.content}</Text>
              </View>
            );
          case "code":
            return (
              <View key={index} style={styles.codeContainer}>
                <Text style={styles.codeText}>{block.content}</Text>
              </View>
            );
          case "li":
            return (
              <View key={index} style={styles.liRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.liText}>{block.content}</Text>
              </View>
            );
          case "hr":
            return <View key={index} style={styles.hr} />;
          case "img":
            if (!block.src) return null;
            return (
              <View key={index} style={styles.imageWrapper}>
                <Image
                  source={{ uri: block.src }}
                  style={styles.responsiveImage}
                  resizeMode="contain"
                />
                {block.alt && <Text style={styles.imageAlt}>{block.alt}</Text>}
              </View>
            );
          case "p":
          default:
            return (
              <View key={index} style={styles.paragraphContainer}>
                <Text style={styles.paragraphText}>{block.content}</Text>
                {block.links && block.links.length > 0 && (
                  <View style={styles.linksRow}>
                    {block.links.map((link, lIdx) => (
                      <TouchableOpacity
                        key={lIdx}
                        activeOpacity={0.7}
                        onPress={() => handleLinkPress(link.href)}
                        style={styles.linkChip}
                      >
                        <ExternalLink size={11} color="#60a5fa" />
                        <Text style={styles.linkChipText} numberOfLines={1}>
                          {link.text}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
        }
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    gap: 12,
  },
  h1: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 6,
    marginBottom: 4,
  },
  h2: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 2,
  },
  h3: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "700",
  },
  paragraphContainer: {
    marginBottom: 6,
  },
  paragraphText: {
    color: "#e2e8f0",
    fontSize: 14.5,
    lineHeight: 23,
    fontWeight: "400",
  },
  linksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  linkChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    maxWidth: "100%",
  },
  linkChipText: {
    color: "#60a5fa",
    fontSize: 12,
    fontWeight: "600",
  },
  blockquoteContainer: {
    borderLeftWidth: 3.5,
    borderLeftColor: "#3b82f6",
    backgroundColor: "rgba(59, 130, 246, 0.05)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginVertical: 4,
  },
  blockquoteText: {
    color: "#94a3b8",
    fontSize: 13.5,
    fontStyle: "italic",
    lineHeight: 20,
  },
  codeContainer: {
    backgroundColor: "#0d0e14",
    borderWidth: 1,
    borderColor: "#222534",
    padding: 12,
    borderRadius: 10,
    marginVertical: 4,
  },
  codeText: {
    color: "#38bdf8",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12.5,
    lineHeight: 18,
  },
  liRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: 4,
    marginBottom: 4,
  },
  bullet: {
    color: "#3b82f6",
    fontSize: 16,
    lineHeight: 20,
    marginRight: 8,
  },
  liText: {
    color: "#e2e8f0",
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  hr: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 10,
  },
  imageWrapper: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#0d0e14",
    borderWidth: 1,
    borderColor: "#222534",
  },
  responsiveImage: {
    width: "100%",
    height: 220,
  },
  imageAlt: {
    color: "#64748b",
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
    padding: 6,
  },
});
