package io.github.headlesshq.web.events;

import io.github.headlesshq.web.console.JobDto;
import io.github.headlesshq.web.console.JobService;
import io.github.headlesshq.web.console.Prompt;
import io.github.headlesshq.web.logging.WebLogHandler;
import io.github.headlesshq.web.process.GameProcessManager;
import io.github.headlesshq.web.process.ManagedProcess;
import io.github.headlesshq.web.process.ProcessDto;
import io.github.headlesshq.web.progress.WebProgressbarService;
import io.quarkus.runtime.annotations.RegisterForReflection;

/**
 * An event pushed to all connected browsers via {@link EventSocket}.
 * <p>
 * Events are serialized by the {@link EventBus} itself, not by Quarkus REST, so in a native image Jackson only
 * finds the properties of this class and of the payload types registered here.
 * New payload types have to be added to the targets.
 *
 * @param type    the type of the event, e.g. {@code job}, {@code output}, {@code prompt}, {@code progress}.
 * @param payload the json serializable payload of the event.
 */
@RegisterForReflection(targets = {
    WebEvent.class,
    JobDto.class,
    Prompt.class,
    JobService.Output.class,
    WebLogHandler.LogEntry.class,
    ProcessDto.class,
    GameProcessManager.LineEvent.class,
    ManagedProcess.Line.class,
    WebProgressbarService.Progress.class
})
public record WebEvent(String type, Object payload) {
}
