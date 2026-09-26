import { EventsPageContent } from "@/features/events/events-page-content";
import { queryEvents, queryEventsAnalytics } from "@/data/server/ehs-query-actions";

export default function EventsPage() {
  return <EventsPageContent queryEvents={queryEvents} queryEventsAnalytics={queryEventsAnalytics} />;
}
