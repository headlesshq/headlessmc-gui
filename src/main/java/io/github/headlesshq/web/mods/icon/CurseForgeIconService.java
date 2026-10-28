package io.github.headlesshq.web.mods.icon;

import io.github.headlesshq.headlessmc.config.Holder;
import io.github.headlesshq.headlessmc.mods.ModType;
import io.github.headlesshq.headlessmc.mods.curseforge.CurseForgeConfig;
import io.github.headlesshq.headlessmc.net.NetConfig;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;
import org.jspecify.annotations.Nullable;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Looks up the logos of CurseForge projects. HeadlessMc's {@code RemoteMod}s only carry the slug,
 * so the logos of slugs that are not cached yet are fetched by repeating the search with
 * <a href=https://docs.curseforge.com/rest-api/#search-mods>/v1/mods/search</a>.
 */
@ApplicationScoped
public class CurseForgeIconService {
    private static final Logger LOG = Logger.getLogger(CurseForgeIconService.class);
    private static final JsonMapper MAPPER = new JsonMapper();
    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private static final int MINECRAFT = 432;
    private static final Map<String, Integer> CLASSES = Map.of(
        ModType.MOD.name(), 6,
        ModType.PLUGIN.name(), 5,
        ModType.RESOURCE_PACK.name(), 12,
        ModType.MOD_PACK.name(), 4471,
        ModType.SHADER.name(), 6552,
        ModType.DATA_PACK.name(), 6945
    );

    // class id + slug -> logo url, empty if the project has no logo
    private final Map<String, Optional<String>> cache = new ConcurrentHashMap<>();
    private final HttpClient client = HttpClient.newBuilder()
        .followRedirects(HttpClient.Redirect.NORMAL)
        .connectTimeout(TIMEOUT)
        .build();

    private final Holder<CurseForgeConfig> config;
    private final Holder<NetConfig> netConfig;
    private final String apiUrl;

    @Inject
    public CurseForgeIconService(
        Holder<CurseForgeConfig> config,
        Holder<NetConfig> netConfig,
        @ConfigProperty(name = "hmc.web.curseforge.api-url", defaultValue = "https://api.curseforge.com") String apiUrl
    ) {
        this.config = config;
        this.netConfig = netConfig;
        this.apiUrl = apiUrl.endsWith("/") ? apiUrl.substring(0, apiUrl.length() - 1) : apiUrl;
    }

    /**
     * @param slugs       the slugs of the CurseForge projects found by a search.
     * @param type        the type of the projects.
     * @param query       the query of the search.
     * @param gameVersion the game version the search was for.
     * @return the logo urls of the projects that have one, by slug.
     * Empty if the request fails, icons are not worth failing a search for.
     */
    public Map<String, String> getIcons(Collection<String> slugs, ModType type, String query, @Nullable String gameVersion) {
        Integer classId = CLASSES.get(type.name());
        if (classId == null) {
            return Map.of();
        }

        if (slugs.stream().anyMatch(slug -> !cache.containsKey(key(classId, slug)))) {
            try {
                if (fetch(classId, query, gameVersion)) {
                    slugs.forEach(slug -> cache.putIfAbsent(key(classId, slug), Optional.empty()));
                }
            } catch (IOException | RuntimeException e) {
                LOG.debugf(e, "Failed to fetch CurseForge logos for %s", query);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }

        Map<String, String> result = new HashMap<>();
        for (String slug : slugs) {
            Optional<String> icon = cache.get(key(classId, slug));
            if (icon != null && icon.isPresent()) {
                result.put(slug, icon.get());
            }
        }

        return result;
    }

    private boolean fetch(int classId, String query, @Nullable String gameVersion) throws IOException, InterruptedException {
        String apiKey = config.get().apiKey().filter(key -> !key.isBlank()).orElse(null);
        if (apiKey == null) {
            return false;
        }

        StringBuilder url = new StringBuilder(apiUrl)
            .append("/v1/mods/search?gameId=").append(MINECRAFT)
            .append("&classId=").append(classId)
            .append("&pageSize=50&searchFilter=").append(URLEncoder.encode(query, StandardCharsets.UTF_8));
        if (gameVersion != null) {
            url.append("&gameVersion=").append(URLEncoder.encode(gameVersion, StandardCharsets.UTF_8));
        }

        HttpRequest request = HttpRequest.newBuilder(URI.create(url.toString()))
            .header("User-Agent", netConfig.get().userAgent())
            .header("Accept", "application/json")
            .header("x-api-key", apiKey)
            .timeout(TIMEOUT)
            .GET()
            .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IOException("CurseForge responded with " + response.statusCode() + ": " + response.body());
        }

        for (JsonNode project : MAPPER.readTree(response.body()).path("data")) {
            String slug = project.path("slug").asString("");
            if (slug.isEmpty()) {
                continue;
            }

            JsonNode logo = project.path("logo");
            String icon = List.of("thumbnailUrl", "url").stream()
                .map(field -> logo.path(field).asString(""))
                .filter(value -> !value.isBlank())
                .findFirst()
                .orElse(null);
            cache.put(key(classId, slug), Optional.ofNullable(icon));
        }

        return true;
    }

    private static String key(int classId, String slug) {
        return classId + ":" + slug;
    }

}
