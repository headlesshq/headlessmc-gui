package io.github.headlesshq.web.desktop;

import io.quarkus.runtime.Quarkus;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.io.IOException;
import java.io.OutputStream;

/**
 * Shuts the application down once {@link System#in} reaches end of stream, if {@code hmc.web.exit-on-stdin-close} is set.
 * The desktop app starts the backend with a piped stdin and closes it to request a graceful shutdown.
 * The operating system closes the pipe as well when the desktop app dies, so the backend never outlives it.
 */
@ApplicationScoped
public class ParentProcessWatcher {
    private static final Logger LOG = Logger.getLogger(ParentProcessWatcher.class);

    private final boolean enabled;

    @Inject
    public ParentProcessWatcher(@ConfigProperty(name = "hmc.web.exit-on-stdin-close", defaultValue = "false") boolean enabled) {
        this.enabled = enabled;
    }

    void onStart(@Observes StartupEvent event) {
        if (!enabled) {
            return;
        }

        Thread thread = new Thread(this::awaitEndOfStream, "hmc-web-stdin-watcher");
        thread.setDaemon(true);
        thread.start();
    }

    private void awaitEndOfStream() {
        try {
            System.in.transferTo(OutputStream.nullOutputStream());
        } catch (IOException e) {
            LOG.warn("Failed to read stdin, shutting down", e);
        }

        LOG.info("stdin closed, shutting down");
        Quarkus.asyncExit();
    }

}
