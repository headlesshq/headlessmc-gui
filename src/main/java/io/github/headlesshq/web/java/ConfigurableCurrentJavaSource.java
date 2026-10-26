package io.github.headlesshq.web.java;

import io.github.headlesshq.headlessmc.java.Java;
import io.github.headlesshq.headlessmc.java.JavaSource;
import io.github.headlesshq.headlessmc.java.sources.CurrentJavaSource;
import io.github.headlesshq.headlessmc.java.sources.JavaExecutableFinder;
import io.github.headlesshq.headlessmc.java.version.SpecificationVersionParser;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.List;

/**
 * Replaces HeadlessMc's {@link CurrentJavaSource} (excluded with {@code quarkus.arc.exclude-types}),
 * so that offering the Java running this application to launch games can be disabled at runtime
 * with {@code hmc.web.java.current.enabled=false}.
 * The desktop app does that: its backend runs on a bundled, trimmed Java runtime that is not meant to run games.
 */
@ApplicationScoped
@Named("java:source:current")
public class ConfigurableCurrentJavaSource implements JavaSource {
    private final CurrentJavaSource delegate;
    private final boolean enabled;

    @Inject
    public ConfigurableCurrentJavaSource(
        SpecificationVersionParser specificationVersionParser,
        JavaExecutableFinder executableFinder,
        @ConfigProperty(name = "hmc.web.java.current.enabled", defaultValue = "true") boolean enabled
    ) {
        this.delegate = new CurrentJavaSource(specificationVersionParser, executableFinder);
        this.enabled = enabled;
    }

    @Override
    public String getName() {
        return delegate.getName();
    }

    @Override
    public List<Java> getJavas() {
        return enabled ? delegate.getJavas() : List.of();
    }

    @Override
    public int sort() {
        return delegate.sort();
    }

}
