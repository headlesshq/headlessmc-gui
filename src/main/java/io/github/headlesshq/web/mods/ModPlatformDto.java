package io.github.headlesshq.web.mods;

import org.jspecify.annotations.Nullable;

import java.util.List;

/**
 * A mod distribution platform that mods can be searched on.
 *
 * @param name    the name of the platform, e.g. {@code modrinth}.
 * @param enabled whether the platform can be used, e.g. CurseForge needs an api key.
 * @param mods    all mods of platforms that only offer a fixed set of mods, like GitHub, so they can be shown without searching.
 *                {@code null} for platforms that have to be searched.
 */
public record ModPlatformDto(String name, boolean enabled, @Nullable List<RemoteModDto> mods) {
}
