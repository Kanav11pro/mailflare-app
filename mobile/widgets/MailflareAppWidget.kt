package app.mailflare.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONObject

class MailflareAppWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val prefs = context.getSharedPreferences("mailflare_widget_prefs", Context.MODE_PRIVATE)
            val unreadCount = prefs.getInt("unread_count", 0)

            // Inflate widget layout
            val views = RemoteViews(context.packageName, android.R.layout.simple_list_item_2)

            // Intent to launch Compose on click
            val composeIntent = Intent(Intent.ACTION_VIEW, Uri.parse("mailflare://compose")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val composePendingIntent = PendingIntent.getActivity(
                context,
                0,
                composeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Intent to open Inbox
            val inboxIntent = Intent(Intent.ACTION_VIEW, Uri.parse("mailflare://inbox")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val inboxPendingIntent = PendingIntent.getActivity(
                context,
                1,
                inboxIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            views.setTextViewText(android.R.id.text1, "$unreadCount Unread Messages")
            views.setTextViewText(android.R.id.text2, "Tap to open Mailflare Inbox")
            views.setOnClickPendingIntent(android.R.id.text1, inboxPendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}
