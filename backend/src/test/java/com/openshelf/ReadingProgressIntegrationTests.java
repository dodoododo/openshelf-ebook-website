package com.openshelf;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.openshelf.dto.request.BookUploadRequest;
import com.openshelf.dto.request.UpdateReadingProgressRequest;
import com.openshelf.dto.response.BookResponse;
import com.openshelf.entity.User;
import com.openshelf.repository.ReadingProgressRepository;
import com.openshelf.repository.UserRepository;
import com.openshelf.security.OpenShelfPrincipal;
import com.openshelf.service.BookService;
import com.openshelf.service.ReadingProgressService;
import jakarta.persistence.EntityManagerFactory;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.Executors;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@AutoConfigureMockMvc
class ReadingProgressIntegrationTests extends PostgresIntegrationTest {
    private final MockMvc mvc;
    private final JsonMapper json;
    private final UserRepository users;
    private final BookService books;
    private final ReadingProgressService service;
    private final ReadingProgressRepository progress;
    private final JdbcTemplate jdbc;
    private final EntityManagerFactory entityManager;

    @Autowired
    ReadingProgressIntegrationTests(MockMvc mvc, JsonMapper json, UserRepository users, BookService books,
            ReadingProgressService service, ReadingProgressRepository progress, JdbcTemplate jdbc, EntityManagerFactory entityManager) {
        this.mvc = mvc; this.json = json; this.users = users; this.books = books; this.service = service;
        this.progress = progress; this.jdbc = jdbc; this.entityManager = entityManager;
    }

    record Reader(UUID id, MockHttpSession session, String csrf) { }
    private Reader reader() throws Exception {
        User user = users.saveAndFlush(new User(UUID.randomUUID()+"@example.com", "unused-test-hash", "Progress Reader", Instant.now()));
        var principal = new OpenShelfPrincipal(user);
        var session = new MockHttpSession();
        session.setAttribute("SPRING_SECURITY_CONTEXT", new SecurityContextImpl(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())));
        var result = mvc.perform(get("/api/v1/auth/csrf").session(session)).andReturn();
        return new Reader(user.getId(), session, json.readTree(result.getResponse().getContentAsString()).path("data").path("token").asText());
    }
    private BookResponse book(Reader reader, String title) throws Exception {
        return books.upload(reader.id(), new BookUploadRequest(title, "Author", ""), new MockMultipartFile("file", "sample.pdf", "application/pdf", Files.readAllBytes(Path.of("../frontend/public/sample.pdf"))));
    }
    private ResultActions save(Reader reader, BookResponse book, int page) throws Exception {
        return mvc.perform(put("/api/v1/books/"+book.id()+"/progress").session(reader.session()).header("X-CSRF-TOKEN", reader.csrf())
                .contentType("application/json").content(json.writeValueAsString(new UpdateReadingProgressRequest(book.file().id(), page))));
    }

    @Test
    void emptyReadThenCreateUpdateRestoreAndMoveBackwardWithoutDuplicateRows() throws Exception {
        var reader = reader(); var book = book(reader, "Progress book");
        mvc.perform(get("/api/v1/books/"+book.id()+"/progress").session(reader.session())).andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
        save(reader, book, 4).andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.data.currentPage").value(4)).andExpect(jsonPath("$.data.furthestPage").value(4))
                .andExpect(jsonPath("$.data.bookFileId").value(book.file().id().toString())).andExpect(jsonPath("$.data.progressPercentage").value(80));
        var id = progress.findOwned(reader.id(), book.id(), book.file().id()).orElseThrow().getId();
        save(reader, book, 2).andExpect(jsonPath("$.data.currentPage").value(2)).andExpect(jsonPath("$.data.furthestPage").value(4));
        save(reader, book, 2).andExpect(status().isOk());
        mvc.perform(get("/api/v1/books/"+book.id()+"/progress").param("bookFileId", book.file().id().toString()).session(reader.session()))
                .andExpect(jsonPath("$.data.currentPage").value(2)).andExpect(jsonPath("$.data.fileVersion").value(1)).andExpect(jsonPath("$.data.totalPages").value(5));
        assertThat(progress.findOwned(reader.id(), book.id(), book.file().id()).orElseThrow().getId()).isEqualTo(id);
        assertThat(jdbc.queryForObject("select count(*) from reading_progress where user_id = ? and book_file_id = ?", Long.class, reader.id(), book.file().id())).isEqualTo(1L);
    }

    @Test
    void rejectsInvalidPagesAndMissingOrInvalidVersionContracts() throws Exception {
        var reader = reader(); var book = book(reader, "Bounds");
        save(reader, book, 0).andExpect(status().isBadRequest());
        save(reader, book, 6).andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("INVALID_READING_PAGE"));
        mvc.perform(put("/api/v1/books/"+book.id()+"/progress").session(reader.session()).header("X-CSRF-TOKEN", reader.csrf()).contentType("application/json").content("{\"currentPage\":2}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/books/not-a-uuid/progress").session(reader.session())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/books/"+UUID.randomUUID()+"/progress").session(reader.session())).andExpect(status().isNotFound());
    }

    @Test
    void ownershipAuthenticationAndCsrfProtectAllProgressRoutes() throws Exception {
        var first = reader(); var second = reader(); var book = book(first, "Private progress");
        save(first, book, 4).andExpect(status().isOk());
        String url = "/api/v1/books/"+book.id()+"/progress";
        mvc.perform(get(url).session(second.session())).andExpect(status().isNotFound());
        save(second, book, 2).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/library/continue-reading").session(second.session())).andExpect(jsonPath("$.data").isEmpty());
        mvc.perform(get(url)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/library/continue-reading")).andExpect(status().isUnauthorized());
        String body = json.writeValueAsString(new UpdateReadingProgressRequest(book.file().id(), 2));
        mvc.perform(put(url).session(first.session()).contentType("application/json").content(body)).andExpect(status().isForbidden());
        mvc.perform(put(url).session(first.session()).header("X-CSRF-TOKEN", "invalid").contentType("application/json").content(body)).andExpect(status().isForbidden());
        var anonymous = mvc.perform(get("/api/v1/auth/csrf")).andReturn();
        String token = json.readTree(anonymous.getResponse().getContentAsString()).path("data").path("token").asText();
        mvc.perform(put(url).session((MockHttpSession) anonymous.getRequest().getSession()).header("X-CSRF-TOKEN", token).contentType("application/json").content(body)).andExpect(status().isUnauthorized());
        assertThat(service.get(first.id(), book.id(), book.file().id()).currentPage()).isEqualTo(4);
    }

    @Test
    void fileReplacementStartsFreshAndRejectsStaleSaves() throws Exception {
        var reader = reader(); var book = book(reader, "Versioned progress");
        save(reader, book, 4).andExpect(status().isOk());
        UUID nextFile = UUID.randomUUID();
        jdbc.update("insert into book_files(id,book_id,version,storage_key,original_filename,content_type,size_bytes,sha256,page_count) values (?,?,2,?,'next.pdf','application/pdf',100,?,5)",
                nextFile, book.id(), UUID.randomUUID()+".pdf", "0".repeat(64));
        mvc.perform(get("/api/v1/books/"+book.id()+"/progress").session(reader.session())).andExpect(jsonPath("$.data").isEmpty());
        save(reader, book, 2).andExpect(status().isConflict()).andExpect(jsonPath("$.error.code").value("FILE_VERSION_CHANGED"));
        mvc.perform(get("/api/v1/books/"+book.id()+"/progress").param("bookFileId", book.file().id().toString()).session(reader.session())).andExpect(status().isConflict());
        assertThat(service.recent(reader.id(), 0, 6).getContent()).isEmpty();
        var saved = service.update(reader.id(), book.id(), new UpdateReadingProgressRequest(nextFile, 2));
        assertThat(saved.fileVersion()).isEqualTo(2);
        assertThat(saved.furthestPage()).isEqualTo(2);
        assertThat(progress.findOwned(reader.id(), book.id(), book.file().id()).orElseThrow().getCurrentPage()).isEqualTo(4);
    }

    @Test
    void recentReadingIsPaginatedSortedAndFetchedWithoutNPlusOne() throws Exception {
        var reader = reader(); var first = book(reader, "First"); var second = book(reader, "Second"); var third = book(reader, "Third");
        service.update(reader.id(), first.id(), new UpdateReadingProgressRequest(first.file().id(), 2));
        service.update(reader.id(), second.id(), new UpdateReadingProgressRequest(second.file().id(), 3));
        service.update(reader.id(), third.id(), new UpdateReadingProgressRequest(third.file().id(), 4));
        var statistics = entityManager.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        var recent = service.recent(reader.id(), 0, 2);
        assertThat(recent.getTotalElements()).isEqualTo(3);
        assertThat(recent.getContent()).extracting(item -> item.book().id()).containsExactly(third.id(), second.id());
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(2);
        mvc.perform(get("/api/v1/library/continue-reading?page=1&size=2").session(reader.session())).andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].book.id").value(first.id().toString())).andExpect(jsonPath("$.pagination.isLast").value(true));
        mvc.perform(get("/api/v1/library/continue-reading?size=51").session(reader.session())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/library/continue-reading?page=-1").session(reader.session())).andExpect(status().isBadRequest());
    }

    @Test
    void concurrentFirstSavesRemainUniqueAndFurthestIsMonotonic() throws Exception {
        var reader = reader(); var book = book(reader, "Concurrent");
        try (var pool = Executors.newFixedThreadPool(6)) {
            var tasks = java.util.Arrays.stream(new int[] {2, 5, 3, 4, 1, 2}).mapToObj(page -> pool.submit(() -> service.update(reader.id(), book.id(), new UpdateReadingProgressRequest(book.file().id(), page)))).toList();
            for (var task : tasks) task.get();
        }
        assertThat(service.get(reader.id(), book.id(), book.file().id()).furthestPage()).isEqualTo(5);
        assertThat(jdbc.queryForObject("select count(*) from reading_progress where user_id = ? and book_file_id = ?", Long.class, reader.id(), book.file().id())).isEqualTo(1L);
    }

    @Test
    void databaseRejectsMismatchedBookFileAndNonpositivePages() throws Exception {
        var reader = reader(); var first = book(reader, "One"); var second = book(reader, "Two");
        assertThatThrownBy(() -> jdbc.update("insert into reading_progress(id,user_id,book_id,book_file_id,current_page,furthest_page) values (?,?,?,?,1,1)",
                UUID.randomUUID(), reader.id(), first.id(), second.file().id())).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("insert into reading_progress(id,user_id,book_id,book_file_id,current_page,furthest_page) values (?,?,?,?,0,0)",
                UUID.randomUUID(), reader.id(), first.id(), first.file().id())).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }
}
