//
//  MailflareWidget.swift
//  Mailflare Mobile — iOS WidgetKit Glanceable Inbox & Quick Compose
//

import WidgetKit
import SwiftUI

struct EmailItem: Codable, Identifiable {
    let id: String
    let senderName: String
    let subject: String
    let snippet: String
    let createdAt: String
}

struct MailflareWidgetEntry: TimelineEntry {
    let date: Date
    let unreadCount: Int
    let starredCount: Int
    let outboxCount: Int
    let recentEmails: [EmailItem]
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> MailflareWidgetEntry {
        MailflareWidgetEntry(
            date: Date(),
            unreadCount: 3,
            starredCount: 1,
            outboxCount: 0,
            recentEmails: [
                EmailItem(id: "1", senderName: "Stripe", subject: "Invoice #1042 Paid", snippet: "Your invoice has been paid", createdAt: "10:30 AM"),
                EmailItem(id: "2", senderName: "Cloudflare", subject: "D1 Database Backup", snippet: "Backup completed successfully", createdAt: "09:15 AM")
            ]
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (MailflareWidgetEntry) -> Void) {
        completion(loadSnapshot())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MailflareWidgetEntry>) -> Void) {
        let entry = loadSnapshot()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadSnapshot() -> MailflareWidgetEntry {
        let defaults = UserDefaults(suiteName: "group.app.mailflare")
        let unread = defaults?.integer(forKey: "widget_unread_count") ?? 0
        let starred = defaults?.integer(forKey: "widget_starred_count") ?? 0
        let outbox = defaults?.integer(forKey: "widget_outbox_count") ?? 0
        return MailflareWidgetEntry(date: Date(), unreadCount: unread, starredCount: starred, outboxCount: outbox, recentEmails: [])
    }
}

struct MailflareWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            Color(red: 11/255, green: 12/255, blue: 16/255)
            switch family {
            case .systemSmall:
                SmallWidgetView(entry: entry)
            case .systemMedium:
                MediumWidgetView(entry: entry)
            default:
                SmallWidgetView(entry: entry)
            }
        }
    }
}

struct SmallWidgetView: View {
    let entry: MailflareWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: "envelope.fill")
                    .foregroundColor(Color.blue)
                    .font(.system(size: 16))
                Spacer()
                if entry.outboxCount > 0 {
                    Text("\(entry.outboxCount) 📴")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.yellow)
                }
            }
            Spacer()
            Text("\(entry.unreadCount)")
                .font(.system(size: 38, weight: .heavy, design: .rounded))
                .foregroundColor(.white)
            Text("Unread Messages")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Color.gray)
        }
        .padding(14)
        .widgetURL(URL(string: "mailflare://inbox"))
    }
}

struct MediumWidgetView: View {
    let entry: MailflareWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "envelope.fill")
                    .foregroundColor(Color.blue)
                Text("Mailflare Inbox")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Link(destination: URL(string: "mailflare://compose")!) {
                    HStack(spacing: 4) {
                        Image(systemName: "square.and.pencil")
                        Text("Compose")
                    }
                    .font(.system(size: 11, weight: .bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
            }

            Divider().background(Color.gray.opacity(0.3))

            if entry.recentEmails.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("\(entry.unreadCount) Unread Messages")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                    Text("Inbox is up to date.")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
                .padding(.top, 4)
            } else {
                ForEach(entry.recentEmails.prefix(2)) { email in
                    Link(destination: URL(string: "mailflare://message/\(email.id)")!) {
                        VStack(alignment: .leading, spacing: 2) {
                            HStack {
                                Text(email.senderName)
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.white)
                                Spacer()
                                Text(email.createdAt)
                                    .font(.system(size: 10))
                                    .foregroundColor(.gray)
                            }
                            Text(email.subject)
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                                .lineLimit(1)
                        }
                    }
                }
            }
        }
        .padding(12)
    }
}

@main
struct MailflareWidgetsBundle: WidgetBundle {
    var body: some Widget {
        MailflareWidget()
    }
}

struct MailflareWidget: Widget {
    let kind: String = "MailflareWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            MailflareWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Mailflare Inbox")
        .description("Quick glance at unread messages and 1-tap compose.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
