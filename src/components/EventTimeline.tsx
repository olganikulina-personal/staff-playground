import type { TimelineEvent } from "../simulations/types";

interface EventTimelineProps {
  readonly events: readonly TimelineEvent[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  return (
    <section className="lab-panel" aria-labelledby="timeline-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Observe</p>
          <h2 id="timeline-heading">Event timeline</h2>
        </div>
        <span className="evidence-badge">
          {events.length > 0 && !events[0].simulated
            ? "Measured in this browser"
            : "Simulated"}
        </span>
      </div>
      {events.length === 0 ? (
        <p className="empty-state">Run a scenario to populate the timeline.</p>
      ) : (
        <ol className="event-timeline" aria-label="Simulation timeline">
          {events.map((event) => (
            <li key={`${event.sequence}-${event.kind}`}>
              <span className="event-sequence">{event.sequence}</span>
              <div>
                <div className="event-title-row">
                  <strong>{event.label}</strong>
                  <span className="evidence-badge">
                    {event.simulated ? "Simulated" : "Measured in this browser"}
                  </span>
                </div>
                <p>{event.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
